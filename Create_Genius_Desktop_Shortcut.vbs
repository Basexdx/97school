Option Explicit
Dim shell, fso, root, desktop, link, shortcut, wscriptPath
Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
root = fso.GetParentFolderName(WScript.ScriptFullName)
desktop = shell.SpecialFolders("Desktop")
link = desktop & "\Genius.lnk"
wscriptPath = shell.ExpandEnvironmentStrings("%SystemRoot%\System32\wscript.exe")
Set shortcut = shell.CreateShortcut(link)
shortcut.TargetPath = wscriptPath
shortcut.Arguments = """" & root & "\Genius_Start.vbs" & """"
shortcut.WorkingDirectory = root
shortcut.IconLocation = root & "\Genius.ico,0"
shortcut.Description = "Genius — физика открывает мир"
shortcut.Save
MsgBox "Ярлык Genius создан на рабочем столе. Теперь приложение запускается двойным кликом.", 64, "Genius"
