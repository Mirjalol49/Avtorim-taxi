urls=(
  "https://kbeipwrcdqgmjmhfausn.supabase.co/storage/v1/object/public/car-damages/7ff78495-7dc5-4497-bf33-266ff8141982/mozin3q8zbs1/0_1778402013513.jpg"
  "https://kbeipwrcdqgmjmhfausn.supabase.co/storage/v1/object/public/car-damages/7ff78495-7dc5-4497-bf33-266ff8141982/mozin3q8zbs1/1_1778402013820.jpg"
  "https://kbeipwrcdqgmjmhfausn.supabase.co/storage/v1/object/public/car-damages/7ff78495-7dc5-4497-bf33-266ff8141982/mozin3q8zbs1/2_1778402013514.jpg"
  "https://kbeipwrcdqgmjmhfausn.supabase.co/storage/v1/object/public/car-damages/7ff78495-7dc5-4497-bf33-266ff8141982/mozin3q8zbs1/3_1778402013514.jpg"
  "https://kbeipwrcdqgmjmhfausn.supabase.co/storage/v1/object/public/car-damages/7ff78495-7dc5-4497-bf33-266ff8141982/mozin3q8zbs1/4_1778402013820.jpg"
  "https://kbeipwrcdqgmjmhfausn.supabase.co/storage/v1/object/public/car-damages/7ff78495-7dc5-4497-bf33-266ff8141982/mozin3q8zbs1/5_1778402013819.jpg"
  "https://kbeipwrcdqgmjmhfausn.supabase.co/storage/v1/object/public/car-damages/7ff78495-7dc5-4497-bf33-266ff8141982/mozin3q8zbs1/6_1778402013820.jpg"
  "https://kbeipwrcdqgmjmhfausn.supabase.co/storage/v1/object/public/car-damages/7ff78495-7dc5-4497-bf33-266ff8141982/mozin3q8zbs1/7_1778402013820.jpg"
)
for url in "${urls[@]}"; do
  curl -s -I "$url" | grep -i content-length
done
