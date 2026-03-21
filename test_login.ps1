$body = @{
    email = "vignan123@gmail.com"
    password = "Test1234"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri 'http://localhost:4000/api/v1/auth/login' -Method Post -ContentType 'application/json' -Body $body
Write-Host $response
