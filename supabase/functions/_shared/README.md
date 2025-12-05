# Shared Supabase Client Utilities (DEPRECATED)

> **⚠️ IMPORTANT**: This shared module is no longer used by Edge Functions. All Edge Functions
> have been updated to be self-contained to prevent 500 errors during deployment or cold starts.
> 
> **DO NOT** import from this module in Edge Functions. Instead, inline the necessary helper
> functions directly in your Edge Function code.

This directory previously contained shared utility functions for Supabase Edge Functions.
The code remains here for reference only.

## Why Self-Contained?

Supabase Edge Functions can experience issues when importing from `_shared` modules:
- Module resolution failures during deployment
- 500 errors on cold starts
- Inconsistent behavior across deployments

## How to Use (in new functions)

Instead of importing from `_shared`, copy the necessary helper functions directly into your
Edge Function file. See `sync-microsoft-365/index.ts` for an example of a self-contained function.
