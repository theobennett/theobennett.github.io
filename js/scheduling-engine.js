/**
 * ═══════════════════════════════════════════════════════════
 * ALTOS PSYCHIATRY — SCHEDULING ENGINE
 * js/scheduling-engine.js
 *
 * Provides:
 *  1. Real-time polling for live calendar updates
 *  2. Current-time indicator line on the calendar grid
 *  3. Conflict detection for overlapping appointments
 *  4. Duration-aware slot availability checking
 *  5. Keyboard navigation within the calendar grid
 *  6. Print schedule helper
 *  7. Accessibility announcements
 *
 * This module works alongside the inline <script> in
 * scheduling.html which handles auth, role config, UI
 * bindings, and backend communication.
 *
 * Depends on:
 *  - Global `state` object (set by inline script)
 *  - Global `CONFIG` object (set by inline script)
 *  - DOM element IDs matching scheduling.html
 * ═══════════════════════════════════════════════════════════
 */

;(function (window) {
  'use strict'

  var SchedulingEngine = {}


  /* ═══════════════════════════════════════════════════════
     1. REAL-TIME POLLING
     Fetches fresh appointment data every N seconds so
     multiple staff members see updates live.
     ═══════════════════════════════════════════════════════ */
  var _pollTimer = null
  var _pollInterval = 30000 // 30 seconds default

  SchedulingEngine.startPolling = function (fetchFn, interval) {
    _pollInterval = interval || _pollInterval
    SchedulingEngine.stopPolling()

    _pollTimer = setInterval(function () {
      if (document.hidden) return // Don't poll when tab is hidden
      if (typeof fetchFn === 'function') {
        fetchFn()
      }
    }, _pollInterval)

    // Also refresh when tab becomes visible
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden && typeof fetchFn === 'function') {
        fetchFn()
      }
    })
  }

  SchedulingEngine.stopPolling = function () {
    if (_pollTimer) {
      clearInterval(_pollTimer)
      _pollTimer = null
    }
  }

  /**
   * Adjust poll frequency based on role:
   * - Scheduler: every 15s (multiple users booking simultaneously)
   * - Provider:  every 30s
   * - Patient:   every 60s (low contention)
   */
  SchedulingEngine.getPollingInterval = function (role) {
    switch (role) {
      case 'scheduler': return 15000
      case 'provider':  return 30000
      case 'patient':   return 60000
      default:          return 30000
    }
  }


  /* ═══════════════════════════════════════════════════════
     2. CURRENT-TIME INDICATOR
     Draws and updates a red horizontal line across the
     calendar grid showing the current time.
     ═══════════════════════════════════════════════════════ */
  var _timeIndicatorTimer = null

  SchedulingEngine.initTimeIndicator = function (config) {
    // config: { startHour, endHour, slotMinutes }
    _drawTimeIndicator(config)

    // Update every 60 seconds
    _timeIndicatorTimer = setInterval(function () {
      _drawTimeIndicator(config)
    }, 60000)
  }

  SchedulingEngine.destroyTimeIndicator = function () {
    if (_timeIndicatorTimer) {
      clearInterval(_timeIndicatorTimer)
      _timeIndicatorTimer = null
    }
    var existing = document.querySelector('.sched-now-line')
    if (existing) existing.remove()
  }

  function _drawTimeIndicator(config) {
    // Remove existing
    var existing = document.querySelector('.sched-now-line')
    if (existing) existing.remove()

    var now = new Date()
    var hours = now.getHours()
    var minutes = now.getMinutes()

    // Check if current time is within business hours
    if (hours < config.startHour || hours >= config.endHour) return

    // Find today's column in the grid
    var table = document.querySelector('.sched-table')
    if (!table) return

    var tbody = table.querySelector('tbody')
    if (!tbody) return

    // Calculate position as percentage of total grid height
    var totalMinutes = (config.endHour - config.startHour) * 60
    var currentMinutes = (hours - config.startHour) * 60 + minutes
    var pct = (currentMinutes / totalMinutes) * 100

    // Create indicator line
    var line = document.createElement('div')
    line.className = 'sched-now-line'
    line.style.top = pct + '%'
    line.setAttribute('aria-hidden', 'true')
    line.title = 'Current time: ' + _formatTimeSimple(hours, minutes)

    // Attach to tbody (positioned relative)
    tbody.style.position = 'relative'
    tbody.appendChild(line)
  }

  function _formatTimeSimple(h, m) {
    var ampm = h >= 12 ? 'PM' : 'AM'
    var hour = h % 12 || 12
    var min = m < 10 ? '0' + m : m
    return hour + ':' + min + ' ' + ampm
  }


  /* ═══════════════════════════════════════════════════════
     3. CONFLICT DETECTION
     Checks if a proposed appointment overlaps with any
     existing appointments for the same provider.
     ═══════════════════════════════════════════════════════ */
  SchedulingEngine.hasConflict = function (appointments, proposed) {
    // proposed: { date, startHour, startMinute, duration, providerId }
    var pStart = proposed.startHour * 60 + proposed.startMinute
    var pEnd = pStart + proposed.duration

    for (var i = 0; i < appointments.length; i++) {
      var a = appointments[i]
      if (a.date !== proposed.date) continue
      if (a.providerId !== proposed.providerId) continue
      if (a.status === 'cancelled' || a.status === 'rescheduled') continue

      var aStart = (parseInt(a.startHour || a._startH, 10) || 0) * 60 +
                   (parseInt(a.startMinute || a._startM, 10) || 0)
      var aEnd = aStart + (parseInt(a.duration, 10) || 30)

      // Overlap check: two intervals overlap if one starts before the other ends
      if (pStart < aEnd && pEnd > aStart) {
        return {
          conflict: true,
          existingAppt: a,
          message: 'Conflicts with ' + (a.patientName || 'existing appointment') +
                   ' (' + _formatTimeSimple(a._startH || parseInt(a.startHour, 10), a._startM || parseInt(a.startMinute, 10)) +
                   ' – ' + _minutesToTime(aEnd) + ')'
        }
      }
    }

    return { conflict: false }
  }

  function _minutesToTime(totalMin) {
    var h = Math.floor(totalMin / 60)
    var m = totalMin % 60
    return _formatTimeSimple(h, m)
  }


  /* ═══════════════════════════════════════════════════════
     4. SLOT AVAILABILITY CHECKING
     Given a proposed appointment type (with duration),
     check if the slot and all subsequent slots needed
     are available.
     ═══════════════════════════════════════════════════════ */
  SchedulingEngine.isSlotAvailable = function (appointments, slot, duration, slotMinutes) {
    // slot: { date, hour, minute, providerId }
    // Check every sub-slot consumed by this appointment
    var slotsNeeded = Math.ceil(duration / slotMinutes)
    var startMin = slot.hour * 60 + slot.minute

    for (var s = 0; s < slotsNeeded; s++) {
      var checkMin = startMin + (s * slotMinutes)
      var checkH = Math.floor(checkMin / 60)
      var checkM = checkMin % 60

      // Check for conflicts at this sub-slot
      var conflict = SchedulingEngine.hasConflict(appointments, {
        date: slot.date,
        startHour: checkH,
        startMinute: checkM,
        duration: slotMinutes,
        providerId: slot.providerId
      })

      if (conflict.conflict) return false
    }

    return true
  }

  /**
   * Find all available slots for a given date, provider, and duration.
   * Returns array of { hour, minute } objects.
   */
  SchedulingEngine.getAvailableSlots = function (appointments, date, providerId, duration, config) {
    // config: { startHour, endHour, slotMinutes }
    var available = []
    var endMinute = config.endHour * 60

    for (var h = config.startHour; h < config.endHour; h++) {
      for (var m = 0; m < 60; m += config.slotMinutes) {
        var slotEndMin = h * 60 + m + duration
        if (slotEndMin > endMinute) continue // Would extend past business hours

        var slotObj = { date: date, hour: h, minute: m, providerId: providerId }
        if (SchedulingEngine.isSlotAvailable(appointments, slotObj, duration, config.slotMinutes)) {
          available.push({ hour: h, minute: m })
        }
      }
    }

    return available
  }


  /* ═══════════════════════════════════════════════════════
     5. KEYBOARD NAVIGATION
     Arrow keys to move between cells in the calendar grid.
     Enter/Space to select. Escape to deselect.
     ═══════════════════════════════════════════════════════ */
  SchedulingEngine.initKeyboardNav = function () {
    var container = document.getElementById('week-grid-container')
    if (!container) return

    container.addEventListener('keydown', function (e) {
      var current = document.activeElement
      if (!current || !current.classList.contains('sched-table__cell')) return

      var table = current.closest('table')
      if (!table) return

      var cells = Array.prototype.slice.call(
        table.querySelectorAll('.sched-table__cell--open, .sched-table__cell--booked')
      )
      var idx = cells.indexOf(current)
      if (idx === -1) return

      var row = current.closest('tr')
      var rowCells = Array.prototype.slice.call(row.querySelectorAll('td'))
      var colIdx = rowCells.indexOf(current)
      var allRows = Array.prototype.slice.call(table.querySelectorAll('tbody tr'))
      var rowIdx = allRows.indexOf(row)

      var target = null

      switch (e.key) {
        case 'ArrowRight':
          e.preventDefault()
          target = _findNextCell(cells, idx, 1)
          break

        case 'ArrowLeft':
          e.preventDefault()
          target = _findNextCell(cells, idx, -1)
          break

        case 'ArrowDown':
          e.preventDefault()
          target = _findCellInDirection(allRows, rowIdx, colIdx, 1)
          break

        case 'ArrowUp':
          e.preventDefault()
          target = _findCellInDirection(allRows, rowIdx, colIdx, -1)
          break

        case 'Escape':
          e.preventDefault()
          current.blur()
          // Trigger clear booking if something is selected
          var cancelBtn = document.getElementById('booking-cancel-btn')
          if (cancelBtn) cancelBtn.click()
          break

        case 'Home':
          e.preventDefault()
          if (cells.length) cells[0].focus()
          break

        case 'End':
          e.preventDefault()
          if (cells.length) cells[cells.length - 1].focus()
          break
      }

      if (target) target.focus()
    })
  }

  function _findNextCell(cells, currentIdx, direction) {
    var next = currentIdx + direction
    if (next >= 0 && next < cells.length) return cells[next]
    return null
  }

  function _findCellInDirection(rows, currentRow, colIdx, direction) {
    var nextRow = currentRow + direction
    while (nextRow >= 0 && nextRow < rows.length) {
      var cells = rows[nextRow].querySelectorAll('td')
      if (cells[colIdx] && (
        cells[colIdx].classList.contains('sched-table__cell--open') ||
        cells[colIdx].classList.contains('sched-table__cell--booked')
      )) {
        return cells[colIdx]
      }
      nextRow += direction
    }
    return null
  }


  /* ═══════════════════════════════════════════════════════
     6. PRINT SCHEDULE
     Opens browser print dialog with calendar optimized
     for paper output.
     ═══════════════════════════════════════════════════════ */
  SchedulingEngine.printSchedule = function () {
    // Ensure calendar is visible
    var app = document.getElementById('sched-app')
    if (!app || app.style.display === 'none') {
      alert('Please log in and view the calendar before printing.')
      return
    }

    window.print()
  }


  /* ═══════════════════════════════════════════════════════
     7. ACCESSIBILITY — LIVE REGION ANNOUNCEMENTS
     Creates and manages an ARIA live region for dynamic
     updates (slot selected, appointment booked, errors).
     ═══════════════════════════════════════════════════════ */
  var _liveRegion = null

  SchedulingEngine.initA11y = function () {
    if (_liveRegion) return

    _liveRegion = document.createElement('div')
    _liveRegion.id = 'sched-live-region'
    _liveRegion.setAttribute('role', 'status')
    _liveRegion.setAttribute('aria-live', 'polite')
    _liveRegion.setAttribute('aria-atomic', 'true')
    _liveRegion.className = 'sr-only'
    _liveRegion.style.cssText =
      'position:absolute;width:1px;height:1px;padding:0;margin:-1px;' +
      'overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;'
    document.body.appendChild(_liveRegion)

    // Expose global announce function
    window.announce = SchedulingEngine.announce
  }

  SchedulingEngine.announce = function (message) {
    if (!_liveRegion) SchedulingEngine.initA11y()

    // Clear then set (forces re-announcement)
    _liveRegion.textContent = ''
    setTimeout(function () {
      _liveRegion.textContent = message
    }, 100)
  }


  /* ═══════════════════════════════════════════════════════
     8. ICS FILE GENERATOR (Standalone)
     Can be called independently to generate .ics downloads
     for any appointment data.
     ═══════════════════════════════════════════════════════ */
  SchedulingEngine.generateICS = function (appt) {
    // appt: { title, description, location, startDate, endDate, zoomUrl }

    var lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Altos Psychiatry//Scheduling//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:Altos Psychiatry',
      'BEGIN:VEVENT',
      'UID:' + _generateUID(),
      'DTSTAMP:' + _toICSTimestamp(new Date()),
      'DTSTART:' + _toICSTimestamp(appt.startDate),
      'DTEND:' + _toICSTimestamp(appt.endDate),
      'SUMMARY:' + _escapeICS(appt.title || 'Appointment'),
      'DESCRIPTION:' + _escapeICS(appt.description || ''),
      'LOCATION:' + _escapeICS(appt.location || ''),
      'STATUS:CONFIRMED',
      'TRANSP:OPAQUE'
    ]

    // Add Zoom URL
    if (appt.zoomUrl) {
      lines.push('URL:' + appt.zoomUrl)
    }

    // Add 30-minute reminder
    lines.push(
      'BEGIN:VALARM',
      'TRIGGER:-PT30M',
      'ACTION:DISPLAY',
      'DESCRIPTION:Appointment in 30 minutes',
      'END:VALARM'
    )

    // Add 1-day reminder
    lines.push(
      'BEGIN:VALARM',
      'TRIGGER:-P1D',
      'ACTION:DISPLAY',
      'DESCRIPTION:Appointment tomorrow',
      'END:VALARM'
    )

    lines.push('END:VEVENT', 'END:VCALENDAR')

    var content = lines.join('\r\n')
    var blob = new Blob([content], { type: 'text/calendar;charset=utf-8' })
    return URL.createObjectURL(blob)
  }

  function _toICSTimestamp(dt) {
    if (!(dt instanceof Date)) dt = new Date(dt)
    return dt.getFullYear() +
      _pad(dt.getMonth() + 1) +
      _pad(dt.getDate()) + 'T' +
      _pad(dt.getHours()) +
      _pad(dt.getMinutes()) +
      _pad(dt.getSeconds())
  }

  function _escapeICS(str) {
    if (!str) return ''
    return String(str)
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '')
  }

  function _generateUID() {
    return 'altos-' + Date.now().toString(36) + '-' +
      Math.random().toString(36).substr(2, 8) + '@altospsychiatry.com'
  }

  function _pad(n) {
    return n < 10 ? '0' + n : '' + n
  }


  /* ═══════════════════════════════════════════════════════
     9. GOOGLE CALENDAR URL GENERATOR (Standalone)
     ═══════════════════════════════════════════════════════ */
  SchedulingEngine.generateGoogleCalURL = function (appt) {
    // appt: { title, description, location, startDate, endDate }
    var start = _toGCalDate(appt.startDate)
    var end = _toGCalDate(appt.endDate)

    return 'https://calendar.google.com/calendar/render?action=TEMPLATE' +
      '&text=' + encodeURIComponent(appt.title || 'Appointment') +
      '&dates=' + start + '/' + end +
      '&details=' + encodeURIComponent(appt.description || '') +
      '&location=' + encodeURIComponent(appt.location || '') +
      '&sf=true&output=xml'
  }

  function _toGCalDate(dt) {
    if (!(dt instanceof Date)) dt = new Date(dt)
    return dt.getFullYear() +
      _pad(dt.getMonth() + 1) +
      _pad(dt.getDate()) + 'T' +
      _pad(dt.getHours()) +
      _pad(dt.getMinutes()) + '00'
  }


  /* ═══════════════════════════════════════════════════════
     10. APPOINTMENT STATISTICS
     Calculates summary metrics for dashboards and reports.
     Used by scheduler/provider views.
     ═══════════════════════════════════════════════════════ */
  SchedulingEngine.getStats = function (appointments, dateRange) {
    // dateRange: { start: 'YYYY-MM-DD', end: 'YYYY-MM-DD' } (optional)
    var filtered = appointments

    if (dateRange) {
      filtered = appointments.filter(function (a) {
        return (!dateRange.start || a.date >= dateRange.start) &&
               (!dateRange.end || a.date <= dateRange.end)
      })
    }

    var stats = {
      total: 0,
      confirmed: 0,
      noShows: 0,
      cancelled: 0,
      rescheduled: 0,
      telehealth: 0,
      inPerson: 0,
      byType: {},
      byProvider: {},
      byCPT: {},
      byCalendar: { general: 0, tms: 0, ketamine: 0 },
      totalMinutes: 0,
      noShowRate: 0,
      utilizationRate: 0
    }

    filtered.forEach(function (a) {
      if (a.status === 'deleted') return

      stats.total++
      var dur = parseInt(a.duration, 10) || 0

      // Status counts
      switch (a.status) {
        case 'confirmed': stats.confirmed++; break
        case 'no-show':   stats.noShows++; break
        case 'cancelled': stats.cancelled++; break
        case 'rescheduled': stats.rescheduled++; break
      }

      // Format
      if (a.isTelehealth === 'true' || a.isTelehealth === true) {
        stats.telehealth++
      } else {
        stats.inPerson++
      }

      // By type
      var typeKey = a.typeName || a.typeId || 'Unknown'
      stats.byType[typeKey] = (stats.byType[typeKey] || 0) + 1

      // By provider
      var provKey = a.providerName || a.providerId || 'Unknown'
      stats.byProvider[provKey] = (stats.byProvider[provKey] || 0) + 1

      // By CPT
      if (a.cptCode) {
        stats.byCPT[a.cptCode] = (stats.byCPT[a.cptCode] || 0) + 1
      }

      // By calendar
      var cal = a.calType || 'general'
      if (stats.byCalendar.hasOwnProperty(cal)) {
        stats.byCalendar[cal]++
      }

      // Minutes (only count confirmed + no-show for utilization)
      if (a.status === 'confirmed' || a.status === 'no-show') {
        stats.totalMinutes += dur
      }
    })

    // Derived metrics
    var completed = stats.confirmed + stats.noShows
    stats.noShowRate = completed > 0
      ? Math.round((stats.noShows / completed) * 100)
      : 0

    return stats
  }


  /* ═══════════════════════════════════════════════════════
     11. RECURRING APPOINTMENT HELPER
     Generates a series of dates for recurring bookings
     (e.g., weekly TMS sessions, biweekly follow-ups).
     ═══════════════════════════════════════════════════════ */
  SchedulingEngine.generateRecurringSeries = function (options) {
    // options: {
    //   startDate: 'YYYY-MM-DD',
    //   frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly',
    //   count: number of occurrences,
    //   skipWeekends: boolean,
    //   excludeDates: ['YYYY-MM-DD', ...] (holidays, closures)
    // }

    var dates = []
    var current = new Date(options.startDate + 'T12:00:00')
    var count = options.count || 1
    var skip = options.skipWeekends !== false
    var excludes = options.excludeDates || []

    var intervalDays = {
      daily: 1,
      weekly: 7,
      biweekly: 14,
      monthly: 0 // handled separately
    }

    var interval = intervalDays[options.frequency] || 7
    var generated = 0

    // Safety limit to prevent infinite loops
    var maxIterations = count * 4

    while (generated < count && maxIterations-- > 0) {
      var dateStr = _dateToISO(current)
      var dayOfWeek = current.getDay()
      var isWeekend = dayOfWeek === 0 || dayOfWeek === 6
      var isExcluded = excludes.indexOf(dateStr) > -1

      if ((!skip || !isWeekend) && !isExcluded) {
        dates.push(dateStr)
        generated++
      }

      // Advance
      if (options.frequency === 'monthly') {
        current.setMonth(current.getMonth() + 1)
      } else {
        current.setDate(current.getDate() + interval)
      }
    }

    return dates
  }

  /**
   * TMS-specific series generators
   */
  SchedulingEngine.generateTMSSeries = function (startDate, protocol) {
    // protocol: 'traditional' (36 sessions over 6-9 weeks, M-F)
    //           'saint' (10 sessions per day, 5 days = 50 sessions)

    if (protocol === 'saint') {
      // SAINT: 10 sessions/day for 5 consecutive weekdays
      // Each session is 15 min with ~50 min intersession interval
      return SchedulingEngine.generateRecurringSeries({
        startDate: startDate,
        frequency: 'daily',
        count: 5,
        skipWeekends: true
      })
    }

    // Traditional: daily weekday sessions for 36 sessions (~7 weeks)
    return SchedulingEngine.generateRecurringSeries({
      startDate: startDate,
      frequency: 'daily',
      count: 36,
      skipWeekends: true
    })
  }

  SchedulingEngine.generateKetamineSeries = function (startDate, protocol) {
    // protocol: 'induction' (6 infusions over 2-3 weeks)
    //           'maintenance' (monthly boosters)

    if (protocol === 'maintenance') {
      return SchedulingEngine.generateRecurringSeries({
        startDate: startDate,
        frequency: 'monthly',
        count: 6
      })
    }

    // Induction: 3x/week for 2 weeks (Mon, Wed, Fri)
    var dates = []
    var current = new Date(startDate + 'T12:00:00')
    var generated = 0
    var max = 30

    while (generated < 6 && max-- > 0) {
      var dow = current.getDay()
      if (dow === 1 || dow === 3 || dow === 5) { // Mon, Wed, Fri
        dates.push(_dateToISO(current))
        generated++
      }
      current.setDate(current.getDate() + 1)
    }

    return dates
  }


  /* ═══════════════════════════════════════════════════════
     12. DRAG-TO-RESCHEDULE SUPPORT
     Enables drag-and-drop of booked appointment blocks
     to new time slots (staff roles only).
     ═══════════════════════════════════════════════════════ */
  var _dragState = null

  SchedulingEngine.initDragReschedule = function (onReschedule) {
    // onReschedule: callback(apptId, newSlot) called when drag completes

    var container = document.getElementById('week-grid-container')
    if (!container) return

    // Make booked blocks draggable
    container.addEventListener('mousedown', function (e) {
      var block = e.target.closest('.sched-table__cell--booked')
      if (!block) return

      var apptId = block.getAttribute('data-appt-id')
      if (!apptId) return

      e.preventDefault()

      _dragState = {
        apptId: apptId,
        sourceCell: block,
        startX: e.clientX,
        startY: e.clientY,
        ghost: null,
        moved: false
      }

      // Create ghost element
      var ghost = block.cloneNode(true)
      ghost.style.cssText =
        'position:fixed;z-index:9999;pointer-events:none;opacity:0.7;' +
        'width:' + block.offsetWidth + 'px;transform:rotate(2deg);' +
        'box-shadow:0 8px 24px rgba(0,0,0,0.15);'
      document.body.appendChild(ghost)
      _dragState.ghost = ghost

      _updateGhostPosition(e)

      document.addEventListener('mousemove', _onDragMove)
      document.addEventListener('mouseup', _onDragEnd)
    })

    function _onDragMove(e) {
      if (!_dragState) return
      _dragState.moved = true
      _updateGhostPosition(e)

      // Highlight valid drop targets
      var target = _getDropTarget(e)
      _clearDropHighlights()
      if (target) {
        target.classList.add('sched-table__cell--drop-target')
      }
    }

    function _onDragEnd(e) {
      document.removeEventListener('mousemove', _onDragMove)
      document.removeEventListener('mouseup', _onDragEnd)

      if (!_dragState) return

      // Remove ghost
      if (_dragState.ghost) {
        _dragState.ghost.remove()
      }

      _clearDropHighlights()

      // Check if we have a valid drop target
      if (_dragState.moved) {
        var target = _getDropTarget(e)
        if (target && target.classList.contains('sched-table__cell--open')) {
          var newSlot = {
            date: target.getAttribute('data-date'),
            hour: parseInt(target.getAttribute('data-hour'), 10),
            minute: parseInt(target.getAttribute('data-min'), 10),
            providerId: target.getAttribute('data-provider')
          }

          if (typeof onReschedule === 'function') {
            onReschedule(_dragState.apptId, newSlot)
          }
        }
      }

      _dragState = null
    }

    function _updateGhostPosition(e) {
      if (_dragState && _dragState.ghost) {
        _dragState.ghost.style.left = (e.clientX + 12) + 'px'
        _dragState.ghost.style.top = (e.clientY - 10) + 'px'
      }
    }

    function _getDropTarget(e) {
      // Temporarily hide ghost to get element underneath
      if (_dragState && _dragState.ghost) {
        _dragState.ghost.style.display = 'none'
      }
      var el = document.elementFromPoint(e.clientX, e.clientY)
      if (_dragState && _dragState.ghost) {
        _dragState.ghost.style.display = ''
      }

      if (!el) return null
      return el.closest('.sched-table__cell--open')
    }

    function _clearDropHighlights() {
      var highlighted = document.querySelectorAll('.sched-table__cell--drop-target')
      highlighted.forEach(function (cell) {
        cell.classList.remove('sched-table__cell--drop-target')
      })
    }
  }


  /* ═══════════════════════════════════════════════════════
     13. NOTIFICATION SOUNDS (Optional)
     Plays subtle audio cues for appointment events.
     Uses Web Audio API — no external files needed.
     ═══════════════════════════════════════════════════════ */
  var _audioCtx = null

  SchedulingEngine.playSound = function (type) {
    // Respect user preference
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    try {
      if (!_audioCtx) {
        _audioCtx = new (window.AudioContext || window.webkitAudioContext)()
      }

      var osc = _audioCtx.createOscillator()
      var gain = _audioCtx.createGain()
      osc.connect(gain)
      gain.connect(_audioCtx.destination)

      var now = _audioCtx.currentTime

      switch (type) {
        case 'booked':
          // Gentle rising chime
          osc.frequency.setValueAtTime(523, now)        // C5
          osc.frequency.setValueAtTime(659, now + 0.1)  // E5
          osc.frequency.setValueAtTime(784, now + 0.2)  // G5
          gain.gain.setValueAtTime(0.08, now)
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5)
          osc.start(now)
          osc.stop(now + 0.5)
          break

        case 'error':
          // Low buzz
          osc.frequency.setValueAtTime(220, now)
          osc.type = 'square'
          gain.gain.setValueAtTime(0.04, now)
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3)
          osc.start(now)
          osc.stop(now + 0.3)
          break

        case 'click':
          // Soft tick
          osc.frequency.setValueAtTime(1200, now)
          gain.gain.setValueAtTime(0.03, now)
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05)
          osc.start(now)
          osc.stop(now + 0.05)
          break
      }
    } catch (e) {
      // Silently fail — audio is non-essential
    }
  }


  /* ═══════════════════════════════════════════════════════
     14. SESSION TIMEOUT
     Automatically logs out inactive users after a period
     of inactivity. Important for HIPAA compliance on
     shared workstations.
     ═══════════════════════════════════════════════════════ */
  var _sessionTimer = null
  var _sessionTimeout = 15 * 60 * 1000 // 15 minutes default
  var _warningShown = false

  SchedulingEngine.initSessionTimeout = function (options) {
    // options: { timeout (ms), onTimeout, onWarning, warningBefore (ms) }
    _sessionTimeout = options.timeout || _sessionTimeout
    var warningBefore = options.warningBefore || (2 * 60 * 1000) // 2 min before

    function resetTimer() {
      clearTimeout(_sessionTimer)
      _warningShown = false

      _sessionTimer = setTimeout(function () {
        // Show warning first
        if (!_warningShown && typeof options.onWarning === 'function') {
          _warningShown = true
          options.onWarning()

          // Final timeout
          _sessionTimer = setTimeout(function () {
            if (typeof options.onTimeout === 'function') {
              options.onTimeout()
            }
          }, warningBefore)
        } else if (typeof options.onTimeout === 'function') {
          options.onTimeout()
        }
      }, _sessionTimeout - warningBefore)
    }

    // Reset on user activity
    var events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart']
    events.forEach(function (evt) {
      document.addEventListener(evt, resetTimer, { passive: true })
    })

    // Start timer
    resetTimer()
  }

  SchedulingEngine.clearSessionTimeout = function () {
    clearTimeout(_sessionTimer)
  }


  /* ═══════════════════════════════════════════════════════
     15. BOOT / INITIALIZATION
     Called after the inline scheduling.html script sets
     up auth and launches the scheduler. Activates all
     engine features based on the user's role.
     ═══════════════════════════════════════════════════════ */
  SchedulingEngine.boot = function (options) {
    // options: {
    //   role: 'patient' | 'provider' | 'scheduler',
    //   fetchFn: function to call for data refresh,
    //   onReschedule: callback for drag-reschedule,
    //   hours: { startHour, endHour, slotMinutes },
    //   onSessionTimeout: callback when session expires
    // }

    // Accessibility live region
    SchedulingEngine.initA11y()

    // Current-time indicator
    if (options.hours) {
      SchedulingEngine.initTimeIndicator(options.hours)
    }

    // Keyboard navigation
    SchedulingEngine.initKeyboardNav()

    // Real-time polling
    if (options.fetchFn) {
      var pollMs = SchedulingEngine.getPollingInterval(options.role)
      SchedulingEngine.startPolling(options.fetchFn, pollMs)
    }

    // Drag-to-reschedule (staff only)
    if (options.role !== 'patient' && options.onReschedule) {
      SchedulingEngine.initDragReschedule(options.onReschedule)
    }

    // Session timeout (HIPAA)
    SchedulingEngine.initSessionTimeout({
      timeout: options.role === 'patient' ? 10 * 60 * 1000 : 20 * 60 * 1000,
      warningBefore: 2 * 60 * 1000,
      onWarning: function () {
        SchedulingEngine.announce('Your session will expire in 2 minutes due to inactivity.')
        // Could show a modal here
      },
      onTimeout: function () {
        SchedulingEngine.stopPolling()
        SchedulingEngine.destroyTimeIndicator()
        SchedulingEngine.clearSessionTimeout()

        if (typeof options.onSessionTimeout === 'function') {
          options.onSessionTimeout()
        } else {
          // Default: reload page to show auth gate
          alert('Your session has expired due to inactivity. Please log in again.')
          window.location.reload()
        }
      }
    })

    SchedulingEngine.announce('Scheduling calendar loaded. Use arrow keys to navigate time slots.')
  }


  /* ═══════════════════════════════════════════════════════
     16. TEARDOWN
     Clean up all intervals, listeners, and DOM elements.
     ═══════════════════════════════════════════════════════ */
  SchedulingEngine.destroy = function () {
    SchedulingEngine.stopPolling()
    SchedulingEngine.destroyTimeIndicator()
    SchedulingEngine.clearSessionTimeout()

    if (_liveRegion && _liveRegion.parentNode) {
      _liveRegion.parentNode.removeChild(_liveRegion)
      _liveRegion = null
    }

    if (_audioCtx) {
      try { _audioCtx.close() } catch (e) {}
      _audioCtx = null
    }

    _dragState = null
  }


  /* ═══════════════════════════════════════════════════════
     INTERNAL HELPERS
     ═══════════════════════════════════════════════════════ */
  function _dateToISO(d) {
    return d.getFullYear() + '-' +
      _pad(d.getMonth() + 1) + '-' +
      _pad(d.getDate())
  }


  /* ═══════════════════════════════════════════════════════
     EXPORT
     ═══════════════════════════════════════════════════════ */
  window.SchedulingEngine = SchedulingEngine

})(window)
