# Ticket System Enhancement - Testing Checklist

## Pre-Deployment Testing

Use this checklist to verify all features are working correctly before going live.

---

## 1. Database Migration ✓

### Test Steps
```bash
# Apply migration
supabase db push
```

### Verification
```sql
-- Check all new columns exist
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'tickets' 
AND column_name IN (
  'ticket_code',
  'started_at',
  'response_required_by',
  'resolution_required_by',
  'escalated',
  'escalated_at',
  'resolution_time_minutes'
)
ORDER BY column_name;

-- Should return 7 rows

-- Check triggers exist
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_name IN (
  'set_ticket_code_trigger',
  'set_ticket_deadlines_trigger',
  'calculate_resolution_time_trigger'
);

-- Should return 3 rows

-- Check functions exist
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_name IN (
  'generate_ticket_code',
  'set_ticket_code',
  'set_ticket_deadlines',
  'calculate_resolution_time'
)
AND routine_schema = 'public';

-- Should return 4 rows
```

**Expected Results:**
- ✅ All columns created
- ✅ All triggers created
- ✅ All functions created
- ✅ No SQL errors

---

## 2. Ticket Creation (User Flow) ✓

### Test Case 1: Simple Ticket Creation

**Steps:**
1. Log in as a regular user
2. Navigate to Tickets page
3. Click "New Ticket"
4. Observe auto-filled information
   - User email should be pre-filled
   - Branch should be pre-filled (if set in profile)
5. Select a fault type (e.g., "RDP Server")
6. Keep priority as "Medium"
7. Click "Submit Ticket"

**Expected Results:**
- ✅ Form submits successfully
- ✅ Success toast message appears
- ✅ Ticket appears in ticket list
- ✅ Ticket has a unique code (TKT-YYYY-####)
- ✅ Email received by user (confirmation)
- ✅ Emails received by admin team (craig, Jerusha, Graeme)

### Test Case 2: Urgent Ticket Creation

**Steps:**
1. Create new ticket
2. Select "VPN" fault type
3. Change priority to "Urgent"
4. Submit ticket

**Expected Results:**
- ✅ Ticket created with "Urgent" priority badge
- ✅ Resolution deadline set (2 hours from now)
- ✅ Email indicates urgent priority

### Test Case 3: RDP Ticket Routing

**Steps:**
1. Create new ticket
2. Select "RDP Server" fault type
3. Submit ticket

**Expected Results:**
- ✅ Ticket created normally
- ✅ Email sent to Qwerti (support@qwerti.co.za)
- ✅ Email also sent to admin team
- ✅ User confirmation mentions RDP routing

---

## 3. Email Notifications ✓

### Test Case 1: Check Recipients

**Steps:**
1. Create any ticket
2. Check email inboxes

**Expected Results:**
- ✅ craig@zerobitone.co.za receives email (TO or CC)
- ✅ Jerusha.naidoo@oricoles.co.za receives email (CC)
- ✅ graeme.smart@oricoles.co.za receives email (CC)
- ✅ User receives confirmation email

### Test Case 2: Email Content

**Expected Email Contents:**
- ✅ Subject line includes ticket code
- ✅ Priority is color-coded and visible
- ✅ Ticket code displayed prominently
- ✅ Branch information shown
- ✅ Fault type displayed
- ✅ User email included
- ✅ Response time commitment mentioned
- ✅ Professional HTML formatting

### Test Case 3: RDP Routing

**Steps:**
1. Create RDP ticket
2. Check Qwerti email (support@qwerti.co.za)

**Expected Results:**
- ✅ Qwerti receives dedicated RDP email
- ✅ Email contains all ticket details
- ✅ Mentions it's from Oricol Helpdesk

---

## 4. Time Tracking ✓

### Test Case 1: Start Job

**Steps (as Support Staff):**
1. Navigate to open ticket
2. Click "Start Job" button
3. Confirm in dialog

**Expected Results:**
- ✅ Button becomes dialog
- ✅ Status changes to "In Progress"
- ✅ "Start Job" button disappears
- ✅ Work timer starts
- ✅ Database field `started_at` is set

**Verification SQL:**
```sql
SELECT id, ticket_code, status, started_at
FROM tickets
WHERE ticket_code = 'TKT-2024-0001'; -- Replace with your code
```

### Test Case 2: Time Display

**Steps:**
1. View ticket in list
2. Open ticket details

**Expected Results:**
- ✅ Time elapsed badge shows on ticket card
- ✅ Ticket details show "Time Elapsed Since Creation"
- ✅ If started, shows "Work Duration"
- ✅ Times update appropriately

### Test Case 3: Response Deadline

**Steps:**
1. Create ticket
2. Wait 16+ minutes
3. Refresh ticket list

**Expected Results:**
- ✅ After 15 minutes, "Response Overdue" badge appears
- ✅ Ticket has orange/red border
- ✅ "Escalate" button appears

### Test Case 4: Resolution Deadline (Urgent)

**Steps:**
1. Create urgent ticket
2. Start job
3. Wait 2+ hours
4. Refresh

**Expected Results:**
- ✅ "Resolution Overdue" badge appears
- ✅ Visual indicators for urgency
- ✅ Escalation available

---

## 5. Escalation System ✓

### Test Case 1: Manual Escalation

**Steps (as Support Staff):**
1. Find an overdue ticket
2. Click "Escalate" button
3. View ticket details

**Expected Results:**
- ✅ Ticket marked as escalated
- ✅ "⚠️ ESCALATED" badge appears
- ✅ Red border/background on ticket card
- ✅ Database field `escalated` = true
- ✅ `escalated_at` timestamp set

**Verification SQL:**
```sql
SELECT ticket_code, escalated, escalated_at
FROM tickets
WHERE escalated = true;
```

---

## 6. Closing Tickets ✓

### Test Case 1: Close Without Time Log (Non-Support)

**Steps (as Admin, not support staff):**
1. Open a ticket
2. Click "Close Ticket"

**Expected Results:**
- ✅ Ticket closes immediately
- ✅ Status = "closed"
- ✅ `resolved_at` timestamp set

### Test Case 2: Close With Time Log (Support Staff)

**Steps:**
1. Start job on a ticket (if not started)
2. Click "Close Ticket"
3. Dialog appears asking for:
   - Time spent (minutes)
   - Resolution notes

**Expected Results:**
- ✅ "Log Time and Close Ticket" dialog appears
- ✅ Form requires both fields
- ✅ Cannot submit without time and notes
- ✅ After submit:
  - Ticket closes
  - Time log saved in `ticket_time_logs`
  - `resolution_time_minutes` calculated
  - Toast confirmation

**Verification SQL:**
```sql
-- Check ticket closure
SELECT ticket_code, status, resolved_at, resolution_time_minutes
FROM tickets
WHERE ticket_code = 'TKT-2024-0001'; -- Replace

-- Check time log
SELECT ticket_id, minutes, notes, logged_at
FROM ticket_time_logs
WHERE ticket_id = (
  SELECT id FROM tickets WHERE ticket_code = 'TKT-2024-0001'
);
```

### Test Case 3: Resolution Time Calculation

**Steps:**
1. Create ticket at time T
2. Start job at time T+5 min
3. Close at time T+20 min

**Expected Results:**
- ✅ Resolution time = 15 minutes (from start)
- ✅ Field `resolution_time_minutes` ≈ 15

**Steps for Ticket Closed Without Starting:**
1. Create ticket at time T
2. Close immediately at time T+10 min

**Expected Results:**
- ✅ Resolution time = 10 minutes (from creation)
- ✅ Field `resolution_time_minutes` ≈ 10

---

## 7. Ticket Codes ✓

### Test Case 1: Uniqueness

**Steps:**
1. Create 5 tickets in sequence
2. Check codes

**Expected Results:**
- ✅ Each has unique code
- ✅ Format: TKT-YYYY-####
- ✅ Sequential numbering (0001, 0002, 0003...)
- ✅ Year matches current year

**Verification SQL:**
```sql
-- Check for duplicates (should return 0 rows)
SELECT ticket_code, COUNT(*)
FROM tickets
GROUP BY ticket_code
HAVING COUNT(*) > 1;

-- Check code format
SELECT ticket_code
FROM tickets
ORDER BY created_at DESC
LIMIT 10;
```

### Test Case 2: Code in Emails

**Steps:**
1. Create ticket
2. Check confirmation email

**Expected Results:**
- ✅ Code in subject line
- ✅ Code displayed in email body
- ✅ Code visible in admin emails

---

## 8. UI/UX Testing ✓

### Test Case 1: Simplified Form

**Expected Form Fields:**
- ✅ Fault type icon selector (VISIBLE)
- ✅ Priority dropdown (VISIBLE)
- ✅ Optional brief summary (VISIBLE)
- ✅ Auto-filled user info display (VISIBLE, READ-ONLY)
- ❌ Error code field (REMOVED)
- ❌ Manual description textarea (REMOVED)
- ❌ Category field (REMOVED)

### Test Case 2: Ticket List Display

**Expected Elements per Ticket:**
- ✅ Ticket code badge
- ✅ Time elapsed badge
- ✅ Priority badge (color-coded)
- ✅ Status badge
- ✅ Branch badge
- ✅ Fault type badge
- ✅ Overdue indicators (if applicable)
- ✅ Escalation badge (if escalated)
- ✅ Start Job button (for support, if not started)
- ✅ Escalate button (if overdue and not escalated)

### Test Case 3: Ticket Details View

**Expected Information:**
- ✅ Ticket code in header
- ✅ Priority and status badges
- ✅ Title and description
- ✅ Time tracking section (blue box):
  - Time elapsed since creation
  - Work duration (if started)
  - Response deadline with status
  - Resolution deadline (if urgent)
- ✅ User email
- ✅ Branch
- ✅ Fault type
- ✅ Action buttons:
  - Start Job (if not started)
  - Close Ticket
  - Escalate (if applicable)
  - Delete (admin only)

---

## 9. Permissions Testing ✓

### Test Case 1: Regular User

**Expected Permissions:**
- ✅ Can create tickets
- ✅ Can view own tickets only
- ✅ Cannot start jobs
- ✅ Cannot see time logging
- ✅ Cannot escalate
- ✅ Cannot delete tickets

### Test Case 2: Support Staff

**Expected Permissions:**
- ✅ Can create tickets
- ✅ Can view ALL tickets
- ✅ Can start jobs
- ✅ Can log time
- ✅ Can escalate tickets
- ✅ Can close tickets (with time logging)
- ✅ Cannot delete tickets

### Test Case 3: Admin

**Expected Permissions:**
- ✅ Can create tickets for any user
- ✅ Can view ALL tickets
- ✅ Can start jobs
- ✅ Can log time
- ✅ Can escalate tickets
- ✅ Can close tickets
- ✅ Can delete tickets
- ✅ Can see admin user selector in form

---

## 10. Edge Cases ✓

### Test Case 1: Missing Branch in Profile

**Steps:**
1. User without branch set in profile
2. Create ticket

**Expected Results:**
- ✅ Form shows "Not set" for branch
- ✅ Warning message displayed
- ✅ Ticket can still be created
- ✅ Admin should update user's branch

### Test Case 2: Multiple Tickets in Sequence

**Steps:**
1. Create 10 tickets rapidly

**Expected Results:**
- ✅ All get unique codes
- ✅ Sequential numbering maintained
- ✅ No duplicate code errors
- ✅ All emails sent successfully

### Test Case 3: Reopening Closed Ticket

**Steps:**
1. Close a ticket
2. Click "Reopen Ticket"

**Expected Results:**
- ✅ Status changes to "open"
- ✅ `resolved_at` cleared
- ✅ Ticket appears in Open tab
- ✅ Can be worked on again

---

## 11. Performance Testing ✓

### Test Case 1: Ticket List Loading

**Steps:**
1. Create 50+ tickets
2. Navigate to Tickets page

**Expected Results:**
- ✅ Page loads in < 3 seconds
- ✅ All tickets displayed correctly
- ✅ Timers update smoothly

### Test Case 2: Email Sending

**Steps:**
1. Create 5 tickets in quick succession

**Expected Results:**
- ✅ All tickets created successfully
- ✅ All emails sent (may have slight delay)
- ✅ No email send errors in logs

---

## 12. Integration Testing ✓

### Test Case 1: Full Workflow

**Complete workflow from creation to closure:**

1. **User creates ticket** (as regular user)
   - Select fault type
   - Submit
   - Check emails

2. **Support picks up ticket** (as support staff)
   - See ticket in list
   - Click "Start Job"
   - Status → In Progress

3. **Work on issue** (simulate 10 minutes)
   - View time tracking
   - Check deadlines

4. **Close ticket** (as support staff)
   - Click "Close Ticket"
   - Log 10 minutes
   - Add resolution notes
   - Submit

5. **Verify completion**
   - Ticket status = "closed"
   - Time logged correctly
   - Resolution notes saved

**Expected Results:**
- ✅ Entire workflow completes without errors
- ✅ All data captured correctly
- ✅ All emails sent
- ✅ All timestamps recorded

---

## 13. Error Handling ✓

### Test Case 1: Form Validation

**Steps:**
1. Open new ticket form
2. Don't select fault type
3. Try to submit

**Expected Results:**
- ✅ Submit button disabled until fault type selected
- ✅ Visual indication of required field

### Test Case 2: Network Errors

**Steps:**
1. Disable network
2. Try to create ticket

**Expected Results:**
- ✅ Error toast displayed
- ✅ Form remains filled (data not lost)
- ✅ User can retry

---

## Test Results Summary

Use this checklist to track your testing progress:

### Core Functionality
- [ ] Database migration successful
- [ ] Ticket creation works
- [ ] Ticket codes generated correctly
- [ ] Auto-fill working (email, branch)
- [ ] Email notifications sent to all recipients
- [ ] RDP routing works

### Time Tracking
- [ ] Start Job button works
- [ ] Status changes correctly
- [ ] Time elapsed displays
- [ ] Response deadlines tracked
- [ ] Resolution deadlines tracked (urgent)
- [ ] Overdue indicators work

### Workflow
- [ ] Escalation works
- [ ] Time logging on close works
- [ ] Resolution notes required
- [ ] Resolution time calculated
- [ ] Ticket reopening works

### UI/UX
- [ ] Simplified form displays correctly
- [ ] Ticket list shows all info
- [ ] Ticket details complete
- [ ] Visual indicators correct
- [ ] Responsive on mobile

### Permissions
- [ ] Regular user permissions correct
- [ ] Support staff permissions correct
- [ ] Admin permissions correct

### Edge Cases
- [ ] Missing branch handled
- [ ] Multiple rapid tickets work
- [ ] Reopening works

---

## Post-Testing

After completing all tests:

1. ✅ Document any issues found
2. ✅ Fix critical bugs
3. ✅ Re-test failed cases
4. ✅ Get stakeholder approval
5. ✅ Schedule production deployment

---

## Production Deployment Checklist

Before deploying to production:

- [ ] All tests passed
- [ ] Database backup created
- [ ] Migration tested on staging
- [ ] Edge functions deployed to staging
- [ ] Email templates reviewed
- [ ] Email addresses confirmed correct
- [ ] User documentation prepared
- [ ] Support staff trained
- [ ] Rollback plan prepared

---

## Support Contacts

For issues during testing:
- Technical: [Your Dev Team]
- Email Issues: Check Resend dashboard
- Database: Check Supabase logs

---

**Good luck with testing! 🚀**
