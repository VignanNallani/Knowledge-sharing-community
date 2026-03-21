# First login
$loginBody = @{
    email = "vignan123@gmail.com"
    password = "Test1234"
} | ConvertTo-Json

$loginResponse = Invoke-RestMethod -Uri 'http://localhost:4000/api/v1/auth/login' -Method Post -ContentType 'application/json' -Body $loginBody
$token = $loginResponse.message.accessToken

Write-Host "Login successful, token obtained"

# Get mentors
$mentorsResponse = Invoke-RestMethod -Uri 'http://localhost:4000/api/v1/users?limit=52' -Method Get -Headers @{
    'Authorization' = "Bearer $token"
    'Content-Type' = 'application/json'
}

$mentors = $mentorsResponse.data.users | Where-Object { $_.role -eq 'MENTOR' }
Write-Host "Found $($mentors.Count) mentors"

# Find Sarah Chen
$sarahChen = $mentors | Where-Object { $_.name -like "*Sarah*" -or $_.name -like "*Chen*" }
if ($sarahChen) {
    Write-Host "Found Sarah Chen: $($sarahChen.name) (ID: $($sarahChen.id))"
    
    # Get Sarah's slots for tomorrow
    $tomorrow = (Get-Date).AddDays(1).ToString('yyyy-MM-dd')
    $slotsResponse = Invoke-RestMethod -Uri "http://localhost:4000/api/v1/bookings/slots/$($sarahChen.id)?date=$tomorrow" -Method Get -Headers @{
        'Authorization' = "Bearer $token"
        'Content-Type' = 'application/json'
    }
    
    Write-Host "Sarah's slots for tomorrow ($tomorrow):"
    $slotsResponse.data | ForEach-Object {
        Write-Host "  - Slot: $($_.startAt) to $($_.endAt) (Status: $($_.status))"
    }
} else {
    Write-Host "Sarah Chen not found. Available mentors:"
    $mentors | ForEach-Object {
        Write-Host "  - $($_.name) (ID: $($_.id))"
    }
}
