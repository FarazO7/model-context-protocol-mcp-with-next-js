FICTIONAL SAMPLE FOR A PRODUCT DEMO. Pasted from Slack #acme-delivery and Jira, 3 Nov 2026.

riya [10:02] store finder build 1.4.0 is up on TestFlight and the Play internal track
riya [10:05] pin code search ✅ GPS search ✅ distance in km ✅ hours from Acme store API ✅
arjun [10:21] stock badge only shows for ~60% of stores. Acme inventory API returns null stock for the rest. logged with their team as ACME-API-212
riya [10:40] directions: opens Google Maps on Android, Apple Maps on iOS ✅
qa-bot [11:00] Crashlytics (staging) 31 Oct to 3 Nov: crash-free sessions 99.71% across 2,140 sessions
neha [11:30] a11y checklist v2: contrast pass. font scaling pass EXCEPT the store-hours row truncates at the largest text size. BF-388, fix going into 1.4.1 tomorrow

Jira (BF project)
BF-341 Search by pin code: Done
BF-342 Search by current location: Done
BF-350 Store detail screen: Done
BF-355 Directions handoff: Done
BF-361 In-stock badge: Done (blocked upstream: ACME-API-212)
BF-388 Store hours truncate at XXL text size: In progress

Links (placeholders for the demo)
TestFlight build 1.4.0: https://example.com/testflight/acme-1-4-0
Play internal track: https://example.com/play/acme-1-4-0
Crashlytics report: https://example.com/crashlytics/acme-staging
Accessibility checklist results: https://example.com/a11y/acme-v2
