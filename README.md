# Altos Psychiatry Website
## Setup & Deployment Guide

---

## 1. GitHub Pages Setup

### One-time setup:
1. Create a GitHub account at github.com (if you don't have one)
2. Create a new repository named **`altospsychiatry.github.io`** (use your actual GitHub username)
   - Make it **Public**
   - Do NOT initialize with a README (you'll upload these files)
3. In your repo Settings → Pages → Source: **Deploy from branch** → `main` → `/ (root)`
4. Upload all these files maintaining the folder structure exactly as-is

### File structure:
```
/
├── index.html
├── header.html
├── footer.html
├── services.html
├── get-started.html
├── css/
│   └── style.css
├── js/
│   └── main.js
├── why-altos/
│   ├── about-us.html
│   ├── for-patients.html
│   ├── for-providers.html
│   ├── our-providers.html
│   └── providers/
│       ├── provider-1.html
│       └── provider-2.html
├── services/
│   ├── care-models.html
│   ├── medication-management.html
│   ├── psychotherapy.html
│   ├── tms.html
│   └── psychedelics.html
├── conditions/
│   ├── depression.html
│   ├── anxiety.html
│   ├── adhd.html
│   └── treatment-resistant-depression.html
├── resources/
│   ├── faq.html
│   └── contact.html
├── media/
│   ├── big_sur_video.mp4    ← your video file
│   └── hero-poster.jpg      ← still frame from video
└── images/
    ├── clinic-room.jpg
    ├── about-hero.jpg
    ├── provider-1.jpg
    └── provider-2.jpg
```

---

## 2. Custom Domain (Optional but recommended)

**Buy `altospsychiatry.com`** from Google Domains (~$12/year) or Namecheap.

To connect to GitHub Pages:
1. In GitHub repo Settings → Pages → Custom domain: enter `altospsychiatry.com`
2. At your domain registrar, add these DNS records:
   - Type A: `185.199.108.153`
   - Type A: `185.199.109.153`
   - Type A: `185.199.110.153`
   - Type A: `185.199.111.153`
   - Type CNAME: `www` → `yourusername.github.io`
3. Check "Enforce HTTPS" in GitHub Pages settings (wait 24h for DNS to propagate)

---



### ⚠️ HIPAA WARNING:
Google Sheets is NOT HIPAA-compliant without a BAA. This form collects **scheduling information only** — name, contact, brief reason for reaching out. Do NOT collect:
- Diagnosis
- Medication names
- Detailed symptom descriptions
- Insurance member IDs

For all clinical intake, use **SimplePractice** (which has a BAA with you).

---

## 4. SimplePractice Integration

1. Update the Patient Portal link in `footer.html` and `why-altos/for-patients.html`:
   - Replace `https://altospsychiatry.simplepractice.com` with your actual SimplePractice URL
   - Found in SimplePractice: Settings → Client Portal → Portal URL

2. SimplePractice handles:
   - HIPAA-compliant intake forms
   - Clinical questionnaires (PHQ-9, GAD-7)
   - Consent forms
   - Secure messaging
   - Telehealth video
   - Billing and superbills

---

## 5. Phone & Fax (HIPAA-Compliant)

For the phone number displayed on the site, use:
- **Spruce Health** (spruce.care) — HIPAA-compliant business phone, texting, fax ~$40/mo
- **iPlum** (iplum.com) — cheaper alternative, separate business line ~$15/mo

Replace `(650) 555-0000` in:
- `header.html`
- `footer.html`
- `resources/contact.html`
- `why-altos/for-patients.html`
- `get-started.html`

Replace `hello@altospsychiatry.com` and `referrals@altospsychiatry.com` with your real email addresses. Use **Google Workspace** (with a signed BAA from Google) for HIPAA-compliant email at your custom domain.

---

## 6. Legal Pages Required

You need these pages before going live. **Hire a healthcare attorney** to draft or review them:

| Page | Purpose | Required? |
|------|---------|-----------|
| `/privacy.html` | HIPAA Privacy Notice + general privacy policy | ✅ Required |
| `/hipaa.html` | Notice of Privacy Practices (NPP) | ✅ Required by HIPAA |
| `/terms.html` | Terms of use for the website | ✅ Recommended |

The HIPAA Notice of Privacy Practices must explain:
- How you use and disclose PHI
- Patient rights (access, amendment, accounting)
- How to file a complaint with HHS

**Resources:**
- HHS sample NPP: hhs.gov/hipaa/for-professionals/privacy/guidance/model-notices-privacy-practices
- California Medical Board: mbc.ca.gov

---

## 7. Medical Disclaimer

Every page should have a disclaimer (included in footer) stating:
- This website is for informational purposes only
- It does not establish a patient-provider relationship
- It is not a substitute for professional medical advice
- For emergencies, call 911 or text/call 988

---

## 8. Things to Replace Before Launch

Search the codebase for these placeholders:

| Placeholder | Replace with |
|------------|-------------|
| `(650) 555-0000` | Your actual phone number |
| `hello@altospsychiatry.com` | Your actual email |
| `referrals@altospsychiatry.com` | Your referral email |
| `401 Quarry Road, Suite 120` | Your actual office address |
| `altospsychiatry.simplepractice.com` | Your SimplePractice URL |
| Provider names / bios | Your real provider information |
| `/images/*.jpg` | Real photos of your office and team |

---

## 9. Compliance Checklist (Pre-Launch)

- [ ] HIPAA Notice of Privacy Practices page live
- [ ] Privacy Policy page live
- [ ] Terms of Use page live
- [ ] SimplePractice BAA signed
- [ ] Google Workspace BAA signed (if using for email)
- [ ] Form clearly states it is for scheduling only, not clinical use
- [ ] Crisis resources (988) visible on every page (in footer)
- [ ] Age restriction (18+) stated on get-started page
- [ ] California-only telehealth restriction noted
- [ ] No outcome claims or treatment guarantees anywhere on the site
- [ ] Provider credentials accurately listed
- [ ] Medical disclaimer present

---

## 10. Images Needed

These images are referenced but not included (you need to provide them):

| File | Suggested content |
|------|----------|

| `/images/provider-1.jpg` | Headshot of provider |
| `/images/provider-2.jpg` | Headshot of provider |

**Free video sources:** pexels.com/videos, pixabay.com/videos
Search: "Big Sur coast", "California coast aerial", "ocean fog morning"
