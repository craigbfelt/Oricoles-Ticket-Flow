# Staff Chat System - Testing Guide

## Overview
A real-time chat system for IT support staff has been implemented with the following features:
- **Direct Messaging**: 1-on-1 private conversations between staff members
- **Broadcast Channel**: Company-wide chat where all staff can participate
- **Real-time Updates**: Instant message delivery using Supabase real-time subscriptions
- **User Profiles**: Display staff members with their names, roles, and avatars

## Database Schema

### Tables Created
1. **staff_chat_rooms** - Stores chat room information
   - `id`: UUID primary key
   - `room_type`: 'direct' or 'broadcast'
   - `room_name`: Name for broadcast channels
   - `created_at`, `updated_at`: Timestamps

2. **staff_chat_participants** - Tracks room membership
   - `id`: UUID primary key
   - `room_id`: Reference to staff_chat_rooms
   - `user_id`: Reference to auth.users
   - `joined_at`: When user joined
   - `last_read_at`: Last read timestamp (for future unread indicator)

3. **staff_chat_messages** - Stores all chat messages
   - `id`: UUID primary key
   - `room_id`: Reference to staff_chat_rooms
   - `sender_id`: Reference to auth.users
   - `message`: Text content
   - `is_edited`, `is_deleted`: Message status flags
   - `created_at`, `updated_at`: Timestamps

### Database Function
- **get_or_create_direct_chat_room(user_id_1, user_id_2)**: Helper function that finds or creates a direct message room between two users

### Security (RLS Policies)
- All tables have Row Level Security enabled
- Authenticated users can view all rooms and participants
- Users can only send messages in rooms they're part of (or broadcast)
- Users can only edit/delete their own messages
- Broadcast messages are visible to all authenticated users

## UI Components

### StaffChat Component (`src/components/StaffChat.tsx`)
Located as a floating button in the bottom-right corner of the screen (above the existing LiveChat button).

#### Features:
1. **Expandable Chat Window**
   - Click the message icon button to open
   - 800x600px chat interface
   - Close button in header

2. **Two-Panel Layout**
   - **Left Sidebar (264px)**: User list with tabs
     - "Broadcast" tab: Shows company-wide channel
     - "Direct" tab: Shows list of all staff members
   - **Right Panel**: Chat conversation area

3. **User List Display**
   - Avatar with initials
   - Full name (or email if name not set)
   - Role (e.g., "admin", "support_staff")
   - Visual indicator for selected chat

4. **Message Display**
   - Own messages: Right-aligned, primary color background
   - Other messages: Left-aligned, muted background
   - Sender name (for others' messages)
   - Message content
   - Timestamp (HH:MM format)
   - Auto-scroll to latest message

5. **Message Input**
   - Text input field at bottom
   - Send button
   - Press Enter to send

## Testing Instructions

### Prerequisites
1. Ensure Supabase is properly configured (`.env` file with correct values)
2. Apply the database migration:
   ```bash
   npm run migrate:apply
   ```
   Or manually run the SQL from:
   `supabase/migrations/20260120092500_create_staff_chat_system.sql`

### Test Cases

#### 1. Initial Setup Test
- [ ] Start the application: `npm run dev`
- [ ] Login with a valid user account
- [ ] Verify the StaffChat button appears in bottom-right corner
- [ ] Verify it appears above the LiveChat button (z-index: 50)

#### 2. Opening Chat Interface
- [ ] Click the StaffChat button
- [ ] Verify chat window opens (800x600px)
- [ ] Verify header shows "IT Support Staff Chat"
- [ ] Verify close button works
- [ ] Verify two tabs: "Broadcast" and "Direct"

#### 3. Broadcast Channel Test
- [ ] Click "Broadcast" tab
- [ ] Verify "Company Wide" room is displayed
- [ ] Click on "Company Wide"
- [ ] Verify chat header shows "Company Wide - IT Support"
- [ ] Type a message and send
- [ ] Verify message appears on right side (your message)
- [ ] Verify message shows correct timestamp
- [ ] Open same chat in another browser/tab (different user)
- [ ] Verify message appears instantly in both windows

#### 4. Direct Message Test
- [ ] Click "Direct" tab
- [ ] Verify list of all staff members appears
- [ ] Verify each user shows:
   - Avatar with initials
   - Full name or email
   - Role (if set)
- [ ] Click on a user
- [ ] Verify chat opens with that user's name in header
- [ ] Send a test message
- [ ] Verify message appears immediately
- [ ] Have the other user send a reply
- [ ] Verify reply appears in real-time

#### 5. Real-time Updates Test
- [ ] Open chat as User A
- [ ] Open chat as User B (in different browser/incognito)
- [ ] Start conversation in broadcast or direct chat
- [ ] Verify messages appear instantly without refresh
- [ ] Send multiple messages rapidly
- [ ] Verify all messages appear in correct order

#### 6. Multiple Users Test
- [ ] Create 3+ test user accounts
- [ ] Test sending messages in broadcast channel
- [ ] Verify all users see all messages
- [ ] Test direct messages between different pairs
- [ ] Verify messages are private (only visible to participants)

#### 7. User Interface Test
- [ ] Verify message alignment (own messages right, others left)
- [ ] Verify color scheme matches application theme
- [ ] Verify scrolling works in user list
- [ ] Verify scrolling works in message area
- [ ] Verify auto-scroll to latest message works
- [ ] Verify long messages wrap correctly
- [ ] Verify long user names truncate with ellipsis

#### 8. Edge Cases
- [ ] Test with user who has no name set (should show email)
- [ ] Test with very long message (should wrap properly)
- [ ] Test with special characters in message
- [ ] Test sending empty message (should be prevented)
- [ ] Test rapid clicking send button
- [ ] Test with poor network (messages should queue/retry)

### Expected Results

#### Visual Layout
```
┌─────────────────────────────────────────────────────┐
│ IT Support Staff Chat                          [X]  │
├──────────────┬──────────────────────────────────────┤
│ [Broadcast]  │  Company Wide - IT Support           │
│ [Direct]     │                                       │
│              │  ┌─────────────────────────┐          │
│ ● Company    │  │ John Smith             │          │
│   Wide       │  │ Hello everyone!        │          │
│              │  │ 10:23 AM               │          │
│ □ John Smith │  └─────────────────────────┘          │
│   admin      │                                       │
│              │         ┌────────────────────────┐   │
│ □ Jane Doe   │         │ Hi! How can I help?   │   │
│   support    │         │ 10:24 AM              │   │
│              │         └────────────────────────┘   │
│              │                                       │
│              │  ─────────────────────────────────    │
│              │  [Type your message...     ] [Send]  │
└──────────────┴──────────────────────────────────────┘
```

## Troubleshooting

### Common Issues

1. **Chat button not appearing**
   - Check browser console for errors
   - Verify user is authenticated
   - Check StaffChat component is imported in App.tsx

2. **Messages not appearing**
   - Check database migration was applied
   - Verify RLS policies are active
   - Check Supabase real-time is enabled
   - Check browser console for subscription errors

3. **User list is empty**
   - Verify other users exist in profiles table
   - Check database query in browser network tab
   - Verify profiles have valid user_id references

4. **Real-time not working**
   - Check Supabase dashboard for real-time status
   - Verify tables are added to publication:
     ```sql
     ALTER PUBLICATION supabase_realtime ADD TABLE public.staff_chat_messages;
     ```
   - Check browser console for WebSocket errors

5. **Direct messages creating duplicate rooms**
   - Check get_or_create_direct_chat_room function
   - Verify unique constraint on staff_chat_participants

## Performance Considerations

- Messages are fetched in batches, ordered by created_at
- Real-time subscriptions are only active when chat is open
- Indexes on room_id, sender_id, and created_at for fast queries
- Consider implementing pagination for rooms with 100+ messages

## Future Enhancements

Potential improvements for future iterations:
- [ ] Typing indicators ("User is typing...")
- [ ] Online/offline status indicators
- [ ] Unread message counts
- [ ] Message read receipts
- [ ] File/image sharing
- [ ] Message reactions (emoji)
- [ ] Message search functionality
- [ ] Message editing history
- [ ] Push notifications for new messages
- [ ] @mention functionality
- [ ] Thread/reply functionality
- [ ] Message formatting (bold, italic, code)
- [ ] Custom broadcast channels (by team/department)

## Security Notes

- All chat data is protected by RLS policies
- Only authenticated users can access chat
- Direct messages are private between participants
- Broadcast messages are visible to all staff
- Users can only edit/delete their own messages
- No plaintext storage of sensitive data
- Consider encryption for highly sensitive conversations

## Migration File

Location: `supabase/migrations/20260120092500_create_staff_chat_system.sql`

To apply manually in Supabase SQL Editor:
1. Go to Supabase Dashboard → SQL Editor
2. Copy entire contents of migration file
3. Run the SQL
4. Verify all tables and functions created successfully
