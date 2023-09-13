# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

$fontCSharpCode = @'
using System;
using System.Collections.Generic;
using System.Text;
using System.IO;
using System.Runtime.InteropServices;
namespace FontResource
{
    public class AddRemoveFonts
    {
        [DllImport("gdi32.dll")]
        static extern int AddFontResource(string lpFilename);

        public static int AddFont(string fontFilePath) {
            try 
            {
                return AddFontResource(fontFilePath);
            }
            catch
            {
                return 0;
            }
        }
    }
}
'@
 
Add-Type $fontCSharpCode
Write-Output "Adding font resources..."
foreach ($font in $(Get-ChildItem ${env:windir}\Fonts)) {
    [FontResource.AddRemoveFonts]::AddFont($font.FullName) | Out-Null
}
