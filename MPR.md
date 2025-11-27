# Master Product Reference (MPR) - PoliCRM

**Current Version:** 0.1.0 (MVP - Fusion Pilot)
**Target Market:** Australian Minor Parties

---

## **TIER 1: CORE MEMBER MANAGEMENT**

### **Essential (MVP - Week 1-4):**

**Member Database:**
- [x] Basic profiles (name, email, phone, address)
- [x] Electoral data (federal division, state division, LGA, ward)
- [x] Membership status (active, lapsed, suspended)
- [x] Join date and renewal tracking
- [x] Tags/labels for segmentation
- [x] Notes and history
- [x] Duplicate detection and merging (via NationBuilder ID)

**AEC/Electoral Verification:**
- [x] Automated enrollment verification
- [x] Electoral division capture
- [x] Verification status tracking
- [x] Bulk verification processing
- [x] Re-verification scheduling (via Daemon)
- [ ] VEC/state registration exports

**Import/Export:**
- [x] CSV import (bulk member upload)
- [ ] CSV export (filtered lists)
- [ ] VEC/AEC format exports
- [x] Duplicate handling on import
- [ ] Field mapping tool
- [ ] Import history and rollback

**Search and Filtering:**
- [x] Text search (name, email, address)
- [x] Filter by status, state, division
- [ ] Advanced filters (tags, dates, custom fields)
- [ ] Saved searches
- [x] Quick filters (verified, unverified, etc.)

**Basic Reporting:**
- [x] Member count by state/division
- [x] Verification status summary
- [ ] Growth metrics (new members/month)
- [ ] Geographic distribution
- [ ] Member activity reports

**Developer Experience**
- [x] Migrate to React + Vite for frontend (was VanillaJS, Astro abandoned due to dependency issues)

---

## **TIER 2: COMMUNICATION**

### **Standard (Month 2-3):**

**Email Campaigns:**
- [ ] Email composer (WYSIWYG editor)
- [ ] Template library (welcome, renewal, event invite)
- [ ] Personalization (merge fields)
- [ ] Segmented sending (by tags, location, status)
- [ ] A/B testing
- [ ] Scheduled sending
- [ ] Email analytics (open rate, click rate, bounces)
- [ ] Unsubscribe management
- [ ] Compliance (CAN-SPAM, GDPR)

**SMS Messaging:**
- [ ] Bulk SMS sending
- [ ] Personalized SMS
- [ ] Opt-in/opt-out management
- [ ] SMS templates
- [ ] Link shortening
- [ ] Delivery tracking
- [ ] Two-way messaging (replies)

**Email Automation:**
- [ ] Welcome sequences (new member onboarding)
- [ ] Renewal reminders (membership expiry)
- [ ] Event reminders
- [ ] Birthday/anniversary emails
- [ ] Re-engagement campaigns (lapsed members)
- [ ] Drip campaigns
- [ ] Trigger-based emails

**Communication History:**
- [ ] Full communication log per member
- [ ] Opens, clicks, replies tracked
- [ ] Unsubscribe history
- [ ] Bounce handling
- [ ] Communication preferences

---

## **TIER 3: ENGAGEMENT & ORGANIZING**

### **Advanced (Month 3-4):**

**Event Management:**
- [ ] Event creation (meetings, rallies, fundraisers)
- [ ] RSVP tracking
- [ ] Attendance check-in (QR codes)
- [ ] Capacity management
- [ ] Waitlists
- [ ] Event reminders (email/SMS)
- [ ] Event calendar (public and internal)
- [ ] Attendance history per member
- [ ] Event analytics

**Volunteer Management:**
- [ ] Volunteer recruitment forms
- [ ] Skill tracking (phone banking, door knocking, social media)
- [ ] Availability scheduling
- [ ] Volunteer assignments
- [ ] Shift scheduling
- [ ] Hours tracking
- [ ] Volunteer leaderboards
- [ ] Recognition and rewards

**Task Management:**
- [ ] Task creation and assignment
- [ ] Task lists by campaign/project
- [ ] Due dates and reminders
- [ ] Status tracking (todo, in progress, done)
- [ ] Task comments and collaboration
- [ ] Recurring tasks
- [ ] Task templates

**Action Tracking:**
- [ ] Phone banking logs
- [ ] Door knocking records
- [ ] Petition signatures
- [ ] Survey responses
- [ ] Donation history
- [ ] Event attendance
- [ ] Email engagement
- [ ] Social media interactions

**Supporter Ladder:**
- [ ] Supporter scoring (engagement level)
- [ ] Progression tracking (subscriber → volunteer → donor → leader)
- [ ] Automated promotions (based on actions)
- [ ] Supporter journey visualization
- [ ] Engagement alerts (highly engaged members)

---

## **TIER 4: FUNDRAISING**

### **Revenue Generation (Month 4-5):**

**Donation Processing:**
- [ ] Online donation forms (embedded or standalone)
- [ ] One-time donations
- [ ] Recurring donations (monthly, annual)
- [ ] Stripe/PayPal integration
- [ ] Custom donation amounts
- [ ] Suggested amounts
- [ ] Donation tiers
- [ ] Tax receipt automation
- [ ] Thank you emails

**Fundraising Pages:**
- [ ] Individual fundraising pages (peer-to-peer)
- [ ] Team fundraising pages
- [ ] Fundraising leaderboards
- [ ] Social sharing
- [ ] Progress thermometers
- [ ] Fundraising goals
- [ ] Campaign attribution

**Donor Management:**
- [ ] Donor profiles and history
- [ ] Donation receipts
- [ ] Tax reporting
- [ ] Major donor tracking
- [ ] Donor segments (by amount, frequency)
- [ ] Lapsed donor identification
- [ ] Donor retention analytics

**Financial Reporting:**
- [ ] Donation reports (by date, campaign, source)
- [ ] Revenue forecasting
- [ ] Donor retention metrics
- [ ] Average donation size
- [ ] Fundraising goal tracking
- [ ] Electoral compliance reporting
- [ ] Transaction history
- [ ] Refund management

---

## **TIER 5: CAMPAIGNS & ELECTORAL**

### **Campaign Operations (Month 5-6):**

**Campaign Management:**
- [ ] Multiple campaigns (federal, state, local)
- [ ] Campaign-specific member lists
- [ ] Campaign dashboards
- [ ] Resource allocation
- [ ] Budget tracking per campaign
- [ ] Campaign timelines
- [ ] Milestone tracking

**Candidate Management:**
- [ ] Candidate profiles
- [ ] Electorate assignments
- [ ] Candidate websites (sub-domains)
- [ ] Candidate email addresses
- [ ] Campaign teams per candidate
- [ ] Candidate resources and assets
- [ ] Endorsement tracking

**Electorate Targeting:**
- [ ] Target seat identification
- [ ] Marginal seat analysis
- [ ] Member distribution by electorate
- [ ] Voter contact goals by electorate
- [ ] Resource allocation by electorate
- [ ] Swing analysis
- [ ] Electorate dashboards

**Voter Contact:**
- [ ] Door knocking app integration
- [ ] Phone banking interface
- [ ] Call scripts
- [ ] Response recording (yes/no/maybe/hostile)
- [ ] Follow-up scheduling
- [ ] Contact history per voter
- [ ] Volunteer contact assignments
- [ ] Contact rate tracking

**Field Organizing:**
- [ ] Canvassing routes (map-based)
- [ ] Territory assignments
- [ ] Field organizer dashboards
- [ ] Daily contact goals
- [ ] Field reports
- [ ] Team coordination
- [ ] Resource distribution

---

## **TIER 6: ANALYTICS & INSIGHTS**

### **Data Intelligence (Month 6-7):**

**Member Analytics:**
- [ ] Demographic breakdowns
- [ ] Geographic distribution maps
- [ ] Growth trends over time
- [ ] Retention and churn rates
- [ ] Engagement scoring
- [ ] Cohort analysis
- [ ] Member lifetime value
- [ ] Acquisition source tracking

**Campaign Analytics:**
- [ ] Contact rates and conversion
- [ ] Voter persuasion modeling
- [ ] Get-out-the-vote (GOTV) effectiveness
- [ ] Volunteer productivity
- [ ] Event attendance trends
- [ ] Fundraising performance
- [ ] Email/SMS effectiveness
- [ ] Social media engagement

**Predictive Analytics:**
- [ ] Member churn prediction
- [ ] Donor lapse prediction
- [ ] High-value member identification
- [ ] Volunteer capacity forecasting
- [ ] Fundraising projections
- [ ] Election outcome modeling

**Custom Reports:**
- [ ] Report builder (drag-and-drop)
- [ ] Saved reports library
- [ ] Scheduled report emails
- [ ] Export to Excel/PDF
- [ ] Data visualization (charts, graphs)
- [ ] Dashboard creation
- [ ] Real-time dashboards

**Data Export:**
- [ ] Full database export
- [ ] Filtered exports
- [ ] API access (for integrations)
- [ ] Webhook notifications
- [ ] Data ownership guarantee
- [ ] GDPR compliance exports

---

## **TIER 7: COMPLIANCE & GOVERNANCE**

### **Legal & Regulatory (Month 7-8):**

**Electoral Compliance:**
- [ ] VEC/AEC registration exports
- [ ] Annual statement automation
- [x] Member verification tracking
- [ ] Authorized officer management
- [ ] Registered officer records
- [ ] Constitution storage
- [ ] AGM tracking and reminders

**Financial Compliance:**
- [ ] Donation limits tracking (per donor)
- [ ] Prohibited donor detection
- [ ] Donation source recording
- [ ] Financial disclosure reports
- [ ] Expenditure tracking
- [ ] In-kind donation recording
- [ ] Electoral expenditure caps

**Data Privacy:**
- [x] GDPR/Privacy Act compliance (PII Encryption)
- [ ] Consent management
- [ ] Data access requests (member data portability)
- [ ] Right to deletion
- [ ] Privacy policy management
- [ ] Data breach notifications
- [ ] Audit logs (who accessed what, when)

**User Permissions:**
- [x] Role-based access control (admin, organizer, volunteer)
- [x] Permission levels (read, write, admin)
- [ ] Data access restrictions (by state, campaign)
- [ ] Audit trails
- [ ] IP restrictions
- [ ] Two-factor authentication
- [x] Session management (Firebase)

---

## **TIER 8: INTEGRATION & AUTOMATION**

### **Ecosystem (Month 8-9):**

**Website Integration:**
- [ ] Embeddable signup forms
- [ ] Donation widgets
- [ ] Event RSVP widgets
- [ ] Volunteer signup forms
- [ ] Petition forms
- [ ] Survey forms
- [ ] Newsletter signup
- [ ] Action page embeds

**Social Media:**
- [ ] Facebook integration (lead ads, events)
- [ ] Twitter/X integration (followers, engagement)
- [ ] Instagram integration
- [ ] Share buttons
- [ ] Social login (signup with Facebook/Google)
- [ ] Social media scheduling
- [ ] Audience sync (Facebook custom audiences)

**Email Service Providers:**
- [ ] Mailchimp integration
- [ ] SendGrid integration
- [ ] Amazon SES integration
- [ ] Email deliverability monitoring
- [ ] Bounce handling
- [ ] Spam complaint management

**Payment Processors:**
- [ ] Stripe (credit card processing)
- [ ] PayPal (one-time and recurring)
- [ ] Direct debit (Australia)
- [ ] Apple Pay / Google Pay
- [ ] Cryptocurrency (optional)

**Accounting Software:**
- [ ] Xero integration
- [ ] QuickBooks integration
- [ ] MYOB integration
- [ ] Automated receipt generation
- [ ] Transaction sync

**Survey Tools:**
- [ ] Google Forms integration
- [ ] Typeform integration
- [ ] SurveyMonkey integration
- [ ] In-platform surveys
- [ ] Survey results sync

**Calendar Sync:**
- [ ] Google Calendar
- [ ] Outlook Calendar
- [ ] Apple Calendar
- [ ] Event sync
- [ ] RSVP updates

**Zapier/Make Integration:**
- [ ] Connect to 1000+ apps
- [ ] Workflow automation
- [ ] Custom integrations
- [ ] API webhooks

---

## **TIER 9: ADVANCED FEATURES**

### **Power User (Month 9-12):**

**Mobile App:**
- [ ] iOS and Android apps
- [ ] Door knocking mode (offline sync)
- [ ] Phone banking interface
- [ ] Event check-in
- [ ] Quick member lookup
- [ ] Push notifications
- [ ] Mobile donations

**Advanced Automation:**
- [ ] Workflow builder (drag-and-drop)
- [ ] If/then logic
- [ ] Multi-step automations
- [ ] Delay and scheduling
- [ ] A/B test automation
- [ ] Automated list maintenance
- [ ] Smart segments (auto-updating)

**AI Features:**
- [ ] Email subject line optimization
- [ ] Send time optimization
- [ ] Content suggestions
- [ ] Churn prediction
- [ ] Donation ask amount optimization
- [ ] Automated tagging (from actions)
- [ ] Sentiment analysis (from responses)

**Peer-to-Peer Organizing:**
- [ ] Member-to-member recruitment
- [ ] Referral tracking
- [ ] Social sharing incentives
- [ ] Team building tools
- [ ] Grassroots leader identification
- [ ] Distributed organizing dashboard

**Multi-Language:**
- [ ] Interface translation
- [ ] Multi-language email templates
- [ ] Localized member portals
- [ ] Language preference tracking
- [ ] Automated translation (optional)

**White-Label:**
- [ ] Custom branding (logo, colors)
- [ ] Custom domain (your-party.com.au)
- [ ] Branded member portal
- [ ] Branded donation pages
- [ ] Branded email templates
- [ ] iOS/Android app branding

---

## **TIER 10: ENTERPRISE FEATURES**

### **Large Party Scale (Year 2):**

**Multi-Tenant:**
- [ ] State branches (separate databases)
- [ ] Shared member data (with permissions)
- [ ] Branch-specific campaigns
- [ ] Central party oversight
- [ ] Branch financial separation
- [ ] Reporting consolidation

**Advanced Security:**
- [ ] SOC 2 compliance
- [ ] Annual security audits
- [ ] Penetration testing
- [ ] Data encryption (at rest and in transit)
- [ ] Dedicated database instances
- [ ] VPN access
- [ ] IP whitelisting
- [ ] Advanced threat detection

**Custom Development:**
- [ ] Custom features development
- [ ] API customization
- [ ] Custom integrations
- [ ] Dedicated support engineer
- [ ] Priority feature requests
- [ ] Beta access to new features

**Training & Support:**
- [ ] Onboarding training (video calls)
- [ ] Documentation library
- [ ] Video tutorials
- [ ] Webinar training sessions
- [ ] Dedicated account manager
- [ ] Priority support (phone, email, Slack)
- [ ] Community forum

**Professional Services:**
- [ ] Data migration from NationBuilder/other CRMs
- [ ] Custom report creation
- [ ] Campaign strategy consulting
- [ ] Email template design
- [ ] Workflow setup
- [ ] Integration configuration
