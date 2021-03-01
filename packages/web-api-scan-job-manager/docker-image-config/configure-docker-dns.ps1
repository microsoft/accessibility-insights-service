# The file that has the DNS entries for docker
$hostsFile = "C:\Windows\System32\drivers\etc\hosts"

try {
	# Check if the DNS table already has a mapping for host.docker.internal

    $DNSEntries = "host.docker.internal"
    Resolve-DnsName -Name $DNSEntries -ErrorAction Stop

    Write-Host("DNS was already configured.")
} catch {
	# Error means the DNS table doesn't have a mappingfor host.docker.internal
    # In Docker the host IP address is configued as the gateway IP address (might not be the case if VPN is configured)

    $hostIP = (ipconfig | where-object {$_ -match "Default Gateway"} | foreach-object{$_.Split(":")[1]}).Trim()
    $src = [System.IO.File]::ReadAllLines($hostsFile)
    $lines = $src += ""

    if(cat $hostsFile | Select-String -Pattern "host.docker.internal") { # The entry exists but without ip value
        For ($i=0; $i -le $lines.length; $i++) {
            if ($lines[$i].Contains("host.docker.internal"))
            {
                $lines[$i] = ("{0} host.docker.internal" -f $hostIP)
                break
            }
        }
    } else { # The entry does not exist, add a new entry
        $lines = $lines += ("{0} host.docker.internal" -f $hostIP)
    }

    [System.IO.File]::WriteAllLines($hostsFile, [string[]]$lines)

    Write-Host("DNS was configured successfully.")
}