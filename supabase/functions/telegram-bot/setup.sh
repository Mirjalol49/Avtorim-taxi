#!/bin/bash
# Run this once to deploy the bot and register the webhook

BOT_TOKEN="${TELEGRAM_BOT_TOKEN:?Set TELEGRAM_BOT_TOKEN env var before running}"
SUPABASE_PROJECT_REF="kbeipwrcqgmjmhfausn"
FUNCTION_URL="https://${SUPABASE_PROJECT_REF}.supabase.co/functions/v1/telegram-bot"

echo "▶ Deploying edge function..."
supabase functions deploy telegram-bot --project-ref "$SUPABASE_PROJECT_REF"

echo "▶ Setting secrets..."
supabase secrets set \
  TELEGRAM_BOT_TOKEN="$BOT_TOKEN" \
  --project-ref "$SUPABASE_PROJECT_REF"

echo "▶ Registering Telegram webhook..."
curl -s "https://api.telegram.org/bot${BOT_TOKEN}/setWebhook?url=${FUNCTION_URL}" | python3 -m json.tool

echo ""
echo "✅ Done! Webhook registered at: $FUNCTION_URL"
echo ""
echo "⚠️  Remember to:"
echo "  1. Run the SQL migration: supabase/migrations/20260423_telegram_sessions.sql"
echo "  2. Create the 'cheques' storage bucket in Supabase dashboard (Storage → New bucket → 'cheques' → Public)"
