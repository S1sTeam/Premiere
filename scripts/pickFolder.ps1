[CmdletBinding()]
param(
    [string]$Title = "Select Folder"
)

try {
    $csharpCode = @'
using System;
using System.Runtime.InteropServices;

[ComImport]
[Guid("43826D1E-E718-42EE-BC55-A1E261C37BFE")]
[InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
internal interface IShellItem {
    void BindToHandler();
    void GetParent();
    void GetDisplayName(uint sigdnName, [MarshalAs(UnmanagedType.LPWStr)] out string ppszName);
    void GetAttributes();
    void Compare();
}

[ComImport]
[Guid("d57c7288-d4ad-4768-be02-9d969532d960")]
[InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
internal interface IFileOpenDialog {
    [PreserveSig] int Show(IntPtr parent);
    void SetFileTypes();
    void SetFileTypeIndex();
    void GetFileTypeIndex();
    void Advise();
    void Unadvise();
    void SetOptions(uint fos);
    void GetOptions(out uint fos);
    void SetDefaultFolder(IShellItem psi);
    void SetFolder(IShellItem psi);
    void GetFolder(out IShellItem ppsi);
    void GetCurrentSelection(out IShellItem ppsi);
    void SetFileName([MarshalAs(UnmanagedType.LPWStr)] string pszName);
    void GetFileName([MarshalAs(UnmanagedType.LPWStr)] out string pszName);
    void SetTitle([MarshalAs(UnmanagedType.LPWStr)] string pszTitle);
    void SetOkButtonLabel([MarshalAs(UnmanagedType.LPWStr)] string pszText);
    void SetFileNameLabel([MarshalAs(UnmanagedType.LPWStr)] string pszLabel);
    void GetResult(out IShellItem ppsi);
    void AddPlace();
    void SetDefaultExtension();
    void Close();
    void SetClientGuid();
    void ClearClientData();
    void SetFilter();
}

[ComImport]
[Guid("DC1C5A9C-E88A-4dde-A5A1-60F82A20AEF7")]
[CoClass(typeof(FileOpenDialogClass))]
internal interface NativeFileOpenDialog : IFileOpenDialog {}

[ComImport]
[Guid("DC1C5A9C-E88A-4dde-A5A1-60F82A20AEF7")]
[ClassInterface(ClassInterfaceType.None)]
internal class FileOpenDialogClass {}

public static class NativeFolderDialog {
    [DllImport("user32.dll")]
    private static extern IntPtr GetForegroundWindow();

    public static string Show(string title) {
        var dialog = (IFileOpenDialog)new NativeFileOpenDialog();
        uint options;
        dialog.GetOptions(out options);
        // FOS_PICKFOLDERS = 0x00000020, FOS_FORCEFILESYSTEM = 0x00000040
        dialog.SetOptions(options | 0x00000020 | 0x00000040);
        if (!string.IsNullOrEmpty(title)) {
            dialog.SetTitle(title);
        }
        IntPtr hwnd = GetForegroundWindow();
        int hr = dialog.Show(hwnd);
        if (hr == 0) {
            IShellItem item;
            dialog.GetResult(out item);
            string path;
            item.GetDisplayName(0x80058000, out path); // SIGDN_FILESYSPATH
            return path ?? "";
        }
        return "";
    }
}
'@
    Add-Type -TypeDefinition $csharpCode -ErrorAction Stop
    $result = [NativeFolderDialog]::Show($Title)
    if ($result) {
        Write-Output $result
        exit 0
    }
    exit 0
} catch {
    try {
        Add-Type -AssemblyName System.Windows.Forms
        $dialog = New-Object System.Windows.Forms.FolderBrowserDialog
        $dialog.Description = $Title
        $dialog.ShowNewFolderButton = $true
        $dummy = New-Object System.Windows.Forms.Form
        $dummy.TopMost = $true
        $res = $dialog.ShowDialog($dummy)
        if ($res -eq [System.Windows.Forms.DialogResult]::OK) {
            Write-Output $dialog.SelectedPath
        }
    } catch {
        exit 1
    }
}
