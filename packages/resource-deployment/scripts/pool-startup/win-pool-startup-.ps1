Enable-WindowsOptionalFeature -Online -FeatureName Microsoft-Windows-Subsystem-Linux
 
Enable-WindowsOptionalFeature -Online -FeatureName VirtualMachinePlatform

Invoke-WebRequest -Uri https://aka.ms/wsl-ubuntu-1804 -OutFile ~/Ubuntu1804.zip -UseBasicParsing
md C:\Distros\Ubuntu1804
Expand-Archive ~/Ubuntu1804.zip C:\Distros\Ubuntu1804

wsl --set-default-version 2

C:\Distros\Ubuntu1804\ubuntu1804.exe

./pool-startup.sh -k $args[0]