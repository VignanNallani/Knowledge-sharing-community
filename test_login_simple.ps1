try {
    Write-Host "Testing login..."
    $response = Invoke-RestMethod -Uri 'http://localhost:4000/api/v1/auth/login' -Method Post -ContentType 'application/json' -Body @{ email = "vignan123@gmail.com"; password = "Test1234" }
    Write-Host "Login response:"
    $response | ConvertTo-Json -Depth 3
} catch {
    Write-Host "Error: $($_.Exception.Message)"
}
