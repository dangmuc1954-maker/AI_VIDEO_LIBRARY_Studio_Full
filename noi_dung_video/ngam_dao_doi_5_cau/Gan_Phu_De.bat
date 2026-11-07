@echo off
chcp 65001 >nul
rem Keo tha video da ghep (7 canh) vao file nay de gan phu de phu_de.srt
if "%~1"=="" (
  echo Hay keo tha file video da ghep vao file Gan_Phu_De.bat nay.
  pause
  exit /b 1
)
set "FFMPEG=ffmpeg"
if exist "%USERPROFILE%\Downloads\ffmpeg\ffmpeg\bin\ffmpeg.exe" set "FFMPEG=%USERPROFILE%\Downloads\ffmpeg\ffmpeg\bin\ffmpeg.exe"
set "OUT=%~dpn1_phude.mp4"
cd /d "%~dp0"
"%FFMPEG%" -y -i "%~1" -vf "subtitles=phu_de.srt:force_style='FontName=Arial,FontSize=10,Bold=1,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BorderStyle=1,Outline=2,Shadow=1,Alignment=2,MarginV=45'" -c:v libx264 -crf 18 -preset medium -c:a copy "%OUT%"
if errorlevel 1 (
  echo Loi khi gan phu de.
) else (
  echo Xong: %OUT%
)
pause
