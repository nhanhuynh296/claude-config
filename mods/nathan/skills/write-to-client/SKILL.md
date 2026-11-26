---
name: write-to-client
description: Email drafting in Nathan's voice. Use when drafting, replying to, or rewriting an email or message to a client, vendor or colleague.
---

# Write to client

Write as Nathan: a technical operations engineer who works closely with the recipient. The email leads with **the ask** or **the outcome**, gives only the facts the recipient needs to act, and ends on one clear next step.

This tone overrides ASD-STE100 for the email body. Chat around the draft stays STE100.

## Steps

1. **Pick the shape** from the table below. Done when one shape is chosen.
2. **Draft.** Apply every rule in *Voice* and *Format*. Done when the body opens with the ask or outcome in its first sentence.
3. **Cut.** Read each sentence and ask: does the recipient need it to act or decide? Delete the ones they do not. Done when every remaining sentence passes. Cut these first:
   - Reassurance and risk talk the recipient did not ask for ("this does not add risk", "worst case…", "X stays installed until…").
   - Rollback or fallback plans. Keep them in the notes, not the email.
   - Context in brackets after a link or ID (course names, page titles). The label before the link is enough.
   - Offers the recipient did not ask for ("Happy to leave it there, or…").
   - Questions the recipient did not raise, unless the work is blocked without the answer.
4. **Hand over.** Put the email in one fenced `text` block, subject line first if it is a new thread. After the block, list any facts you could not verify.

## Shapes

| Situation | Shape | Length |
|---|---|---|
| Work done, nothing needed | Outcome in one line, then an offer to help ("Let me know if you have any issues!") | 1-2 lines |
| Quick answer or instruction | The answer, then the one action you want them to take | 2-4 lines |
| Follow-up on a request | "Just following up on..." + the ask, a direct question ("What is the ETA?"), then brief context if they need it | 3-8 lines |
| Findings, or a decision needed | One-line purpose, labelled sections (`Current state`, `Issues`, `Options`, `Requests`), your recommendation, then what you will do once they confirm | As short as the facts allow |
| Reply to the client's list of points or questions | "Thanks <Name> for the responses." + status in one line. Then one section per point, labelled with the client's own topic name (no numbers), in the order of what is ready for them first. End on the open ask | One short block per point |

## Voice

- Open with the purpose. The first sentence after the greeting is the ask, the outcome, or the thanks plus the purpose ("Thanks for the CSVs. I have compared them and just wanted to double-check with you before applying.").
- Use plain, natural colleague English: "Just following up", "just wanted to double-check", "Happy with either option", "Would it make sense to...", "From my side...", "Let me know your thoughts."
- Write in the first person singular: "I checked", "I will apply", not "we checked" or "we will apply". Nathan does the work and owns the next step. Use "we" only for a shared decision with the recipient ("once we agree").
- Explain technical points by their impact, risk or decision. Add detail only when the recipient needs it to act.
- Make the ask a direct question or a clear request. Say what you will do next and when ("I will apply to UAT once we agree on these points."). For a request to a person outside the thread, ask who: "Can you advise who the point of contact will be for…".
- For a test request, keep it light: "Just a quick check that these work as normal:" and a list of links.
- When the email ends on a question, stop there. Do not add "Let me know your thoughts." after it.
- Be calm and matter-of-fact. One exclamation mark is fine in a friendly closing line.
- Filler is the one hard ban: "I hope you're doing well", "I wanted to reach out", "kindly", "please be advised", "per my previous email", "going forward", "circle back", "touch base". Start with the purpose in its place.

## Format

- Greeting: `Kia ora <Name>,` by default. Use `Kia ora team,` for a group, `Hi <Name>,` for casual quick replies, and `Thanks <Name>,` when you reply to something they sent. Keep `<Name>` as written unless the user's message gives the name.
- The email ends at the last body line. The mail client adds the signature.
- Plain text only: no bold, no markdown headings. A section label is a plain line of its own (`Issues`), with `- ` bullets under it.
- Short paragraphs, one idea each, with a blank line between them.
- Data the recipient checks (IDs, counts, names) goes in bullets, one item per line. Give one identifier per item (an email address, not name + email) and a short date (`15 May`).
- Links: `<Label>: <full URL>`, one per line. The label says what the link shows ("Private Vimeo video", "Login, including Microsoft sign-in").
- Write environment names in capitals: `PROD`, `UAT`.
- Section labels in a reply use the recipient's words for the topic (`Calendar`, `Storage alert`), not item numbers.

## Examples

Real sent emails, with names changed.

```text
Kia ora <Name>,

Just following up to get permission for the Azure privileged permissions that I raised during onboarding.

What is the ETA for this process?

For context, here is what I need for now:

Application Administrator (already have)
- can migrate and delete the old account if needed

User Administrator
- Fixing user attributes that feed SSO claims. This can't modify privileged admin accounts.
```

```text
Kia ora <Name>,

Thanks for the CSVs.

I have compared them and just wanted to double-check with you before applying.

Current state
- Users: 940 vs 1334 in UAT
- Positions: 989 vs 1119 in UAT

Issues
- No usernames/emails
- Duplicate emails

Requests
- Confirm the user gap between the CSV and UAT is intentional
- Confirm test data is wanted in the CSV

I will apply to UAT once we agree on these points.

Let me know your thoughts.
```

```text
Thanks <Name> for the responses. Items XSS and Security header are now live in UAT and ready to test. Here are the answers to your questions.

Stored XSS (Generico)
All video embeds on UAT are converted to Totara's built-in player. Some pages to start with:
- Private Vimeo video: https://uat.example.org/mod/page/view.php?id=8611
- YouTube: https://uat.example.org/mod/page/view.php?id=10640

Security headers
The minimal security headers are on UAT. Just a quick check that these work as normal:
- Login, including Microsoft sign-in: https://uat.example.org/login/index.php

NetSuite token
UAT was cloned from PROD, so the UAT database also held the PROD NetSuite token.
- Done on UAT: deleted the copied PROD token. NetSuite UAT uses its own separate token
- Still to do on PROD: create a new token, Webmad puts it into NetSuite, then I delete the old one. The sync pauses for a few minutes during the switch

Calendar
The change only affects the "Export calendar" link a user copies into Outlook or Google Calendar. Since May, these users have used an export link on PROD:
- user1@example.com - 15 May
- user2@example.com - 25 May

Storage alert
I will set up the 80% disk alert to be sent to <Name>, <Name> and <Name>.

SendGrid
The SendGrid setting for secure links applies to the entire account at once, so PROD and UAT change together.

Can you advise who the point of contact will be for adding DNS records on example.org, as that zone is not in the AWS account?
```

```text
Kia ora team,

Production has been patched.

Let me know if you have any issues!
```
