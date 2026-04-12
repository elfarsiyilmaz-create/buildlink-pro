#!/bin/bash
OUTPUT=~/Desktop/output.txt
echo "=== BuildLink Pro Audit ===" > $OUTPUT
echo "Datum: $(date)" >> $OUTPUT
echo "" >> $OUTPUT

echo "=== profiles tabel kolommen ===" >> $OUTPUT
grep -A 100 "profiles: {" ~/Developer/buildlink-pro/src/integrations/supabase/types.ts | head -80 >> $OUTPUT

echo "" >> $OUTPUT
echo "=== onboarding_completed check ===" >> $OUTPUT
grep -n "onboarding_completed" ~/Developer/buildlink-pro/src/integrations/supabase/types.ts >> $OUTPUT

echo "" >> $OUTPUT
echo "=== referral_code_used check ===" >> $OUTPUT
grep -n "referral_code_used" ~/Developer/buildlink-pro/src/integrations/supabase/types.ts >> $OUTPUT

echo "Klaar! Zie Desktop/output.txt"
