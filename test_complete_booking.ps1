# Complete booking flow test

Write-Host "=== TESTING COMPLETE BOOKING FLOW ===" -ForegroundColor Green

# Step 1: Login
$loginBody = @{
    email = "vignan123@gmail.com"
    password = "Test1234"
} | ConvertTo-Json

$loginResponse = Invoke-RestMethod -Uri 'http://localhost:4000/api/v1/auth/login' -Method Post -ContentType 'application/json' -Body $loginBody
$token = $loginResponse.message.accessToken
Write-Host "✅ Step 1: Login successful" -ForegroundColor Green

# Step 2: Get mentors
$mentorsResponse = Invoke-RestMethod -Uri 'http://localhost:4000/api/v1/users?limit=52' -Method Get -Headers @{
    'Authorization' = "Bearer $token"
    'Content-Type' = 'application/json'
}

$mentors = $mentorsResponse.data.users | Where-Object { $_.role -eq 'MENTOR' }
Write-Host "✅ Step 2: Found $($mentors.Count) mentors" -ForegroundColor Green

# Step 3: Find Sarah Chen
$sarahChen = $mentors | Where-Object { $_.name -like "*Sarah*" -or $_.name -like "*Chen*" }

if ($sarahChen) {
    Write-Host "✅ Step 3: Found Sarah Chen (ID: $($sarahChen.id))" -ForegroundColor Green
    
    # Step 4: Get Sarah's slots for tomorrow
    $tomorrow = (Get-Date).AddDays(1).ToString('yyyy-MM-dd')
    $slotsResponse = Invoke-RestMethod -Uri "http://localhost:4000/api/v1/bookings/slots/$($sarahChen.id)?date=$tomorrow" -Method Get -Headers @{
        'Authorization' = "Bearer $token"
        'Content-Type' = 'application/json'
    }
    
    $availableSlots = $slotsResponse.data | Where-Object { $_.status -eq 'OPEN' }
    Write-Host "✅ Step 4: Found $($availableSlots.Count) available slots for tomorrow ($tomorrow)" -ForegroundColor Green
    
    if ($availableSlots.Count -gt 0) {
        $firstSlot = $availableSlots[0]
        Write-Host "✅ Step 5: Selected slot: $($firstSlot.startAt) to $($firstSlot.endAt)" -ForegroundColor Green
        
        # Step 5: Book the slot
        $bookingBody = @{
            slotId = $firstSlot.id
            topic = "React hooks and state management"
        } | ConvertTo-Json
        
        $bookingResponse = Invoke-RestMethod -Uri 'http://localhost:4000/api/v1/bookings' -Method Post -Headers @{
            'Authorization' = "Bearer $token"
            'Content-Type' = 'application/json'
        } -Body $bookingBody
        
        if ($bookingResponse.success) {
            Write-Host "✅ Step 6: Booking successful! Booking ID: $($bookingResponse.data.id)" -ForegroundColor Green
        } else {
            Write-Host "❌ Step 6: Booking failed: $($bookingResponse.message)" -ForegroundColor Red
        }
        
        # Step 6: Check my bookings
        $myBookingsResponse = Invoke-RestMethod -Uri 'http://localhost:4000/api/v1/bookings/my' -Method Get -Headers @{
            'Authorization' = "Bearer $token"
            'Content-Type' = 'application/json'
        }
        
        $myBookings = $myBookingsResponse.data
        Write-Host "✅ Step 7: Found $($myBookings.Count) bookings" -ForegroundColor Green
        
        $myBookings | ForEach-Object {
            Write-Host "  - Booking with $($_.otherParty.name) ($($_.topic)) - Status: $($_.status)" -ForegroundColor Cyan
        }
        
    } else {
        Write-Host "❌ Step 4: No available slots found for tomorrow" -ForegroundColor Red
    }
    
} else {
    Write-Host "❌ Step 3: Sarah Chen not found" -ForegroundColor Red
    Write-Host "Available mentors:" -ForegroundColor Yellow
    $mentors | ForEach-Object {
        Write-Host "  - $($_.name) (ID: $($_.id))" -ForegroundColor White
    }
}

Write-Host "=== BOOKING FLOW TEST COMPLETE ===" -ForegroundColor Green
