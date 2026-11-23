using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.IO;
using System.IO.Compression;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Threading;
using System.Windows.Forms;
using System.Diagnostics;

namespace AiVideoLibraryInstaller
{
    static class Program
    {
        [STAThread]
        static void Main()
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new InstallerForm());
        }
    }

    public class InstallerForm : Form
    {
        private ProgressBar progressBar;
        private Label statusLabel;
        private Label titleLabel;
        private Label subTitleLabel;
        private Label pathLabel;
        private Button installButton;
        private Button closeButton;
        private CheckBox desktopShortcutCheck;
        private Panel headerPanel;
        private string installDir;
        private bool isInstalling = false;
        private bool isFinished = false;

        public InstallerForm()
        {
            this.Text = "AI VIDEO LIBRARY - Cài Đặt Ứng Dụng";
            this.Size = new Size(560, 420);
            this.FormBorderStyle = FormBorderStyle.None;
            this.StartPosition = FormStartPosition.CenterScreen;
            this.BackColor = Color.FromArgb(15, 23, 42); // Slate 900
            this.DoubleBuffered = true;

            string localAppData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
            installDir = Path.Combine(localAppData, "Programs", "AI VIDEO LIBRARY");

            InitializeComponents();
        }

        private void InitializeComponents()
        {
            // Header Panel
            headerPanel = new Panel();
            headerPanel.Size = new Size(560, 110);
            headerPanel.Location = new Point(0, 0);
            headerPanel.BackColor = Color.FromArgb(30, 27, 75); // Indigo 950
            headerPanel.MouseDown += (s, e) => {
                if (e.Button == MouseButtons.Left) {
                    ReleaseCapture();
                    SendMessage(Handle, WM_NCLBUTTONDOWN, HT_CAPTION, 0);
                }
            };

            // Close Button (X)
            closeButton = new Button();
            closeButton.Text = "✕";
            closeButton.Size = new Size(32, 32);
            closeButton.Location = new Point(518, 10);
            closeButton.FlatStyle = FlatStyle.Flat;
            closeButton.FlatAppearance.BorderSize = 0;
            closeButton.ForeColor = Color.FromArgb(148, 163, 184);
            closeButton.BackColor = Color.Transparent;
            closeButton.Font = new Font("Segoe UI", 10, FontStyle.Bold);
            closeButton.Cursor = Cursors.Hand;
            closeButton.Click += (s, e) => { if (!isInstalling) Application.Exit(); };
            headerPanel.Controls.Add(closeButton);

            // Title Label
            titleLabel = new Label();
            titleLabel.Text = "🤖 AI VIDEO LIBRARY v3.0";
            titleLabel.Font = new Font("Segoe UI", 18, FontStyle.Bold);
            titleLabel.ForeColor = Color.White;
            titleLabel.Location = new Point(30, 25);
            titleLabel.AutoSize = true;
            headerPanel.Controls.Add(titleLabel);

            // Subtitle
            subTitleLabel = new Label();
            subTitleLabel.Text = "Trình Tạo Video AI Veo 3 & Thư Viện AI Chuyên Nghiệp (Bản Thương Mại)";
            subTitleLabel.Font = new Font("Segoe UI", 9.5f, FontStyle.Regular);
            subTitleLabel.ForeColor = Color.FromArgb(199, 210, 254);
            subTitleLabel.Location = new Point(32, 65);
            subTitleLabel.AutoSize = true;
            headerPanel.Controls.Add(subTitleLabel);

            this.Controls.Add(headerPanel);

            // Installation Path Section
            Label installLocationTitle = new Label();
            installLocationTitle.Text = "Thư mục cài đặt ứng dụng:";
            installLocationTitle.Font = new Font("Segoe UI", 9.5f, FontStyle.Bold);
            installLocationTitle.ForeColor = Color.FromArgb(226, 232, 240);
            installLocationTitle.Location = new Point(30, 130);
            installLocationTitle.AutoSize = true;
            this.Controls.Add(installLocationTitle);

            pathLabel = new Label();
            pathLabel.Text = installDir;
            pathLabel.Font = new Font("Consolas", 8.5f, FontStyle.Regular);
            pathLabel.ForeColor = Color.FromArgb(148, 163, 184);
            pathLabel.BackColor = Color.FromArgb(30, 41, 59);
            pathLabel.Location = new Point(30, 155);
            pathLabel.Size = new Size(500, 28);
            pathLabel.TextAlign = ContentAlignment.MiddleLeft;
            pathLabel.Padding = new Padding(8, 0, 0, 0);
            this.Controls.Add(pathLabel);

            // Shortcut Checkbox
            desktopShortcutCheck = new CheckBox();
            desktopShortcutCheck.Text = "Tạo biểu tượng lối tắt ngoài màn hình (Desktop Shortcut)";
            desktopShortcutCheck.Font = new Font("Segoe UI", 9f, FontStyle.Regular);
            desktopShortcutCheck.ForeColor = Color.FromArgb(203, 213, 225);
            desktopShortcutCheck.Location = new Point(30, 195);
            desktopShortcutCheck.Size = new Size(500, 25);
            desktopShortcutCheck.Checked = true;
            this.Controls.Add(desktopShortcutCheck);

            // Progress Bar
            progressBar = new ProgressBar();
            progressBar.Location = new Point(30, 235);
            progressBar.Size = new Size(500, 18);
            progressBar.Style = ProgressBarStyle.Continuous;
            progressBar.Visible = false;
            this.Controls.Add(progressBar);

            // Status Label
            statusLabel = new Label();
            statusLabel.Text = "Sẵn sàng cài đặt. Nhấp 'Cài Đặt Ngay' để bắt đầu.";
            statusLabel.Font = new Font("Segoe UI", 9f, FontStyle.Regular);
            statusLabel.ForeColor = Color.FromArgb(148, 163, 184);
            statusLabel.Location = new Point(30, 268);
            statusLabel.Size = new Size(500, 30);
            this.Controls.Add(statusLabel);

            // Install Button
            installButton = new Button();
            installButton.Text = "🚀 CÀI ĐẶT NGAY (INSTALL)";
            installButton.Font = new Font("Segoe UI", 11, FontStyle.Bold);
            installButton.ForeColor = Color.White;
            installButton.BackColor = Color.FromArgb(99, 102, 241);
            installButton.FlatStyle = FlatStyle.Flat;
            installButton.FlatAppearance.BorderSize = 0;
            installButton.Location = new Point(30, 315);
            installButton.Size = new Size(500, 48);
            installButton.Cursor = Cursors.Hand;
            installButton.Click += InstallButton_Click;
            this.Controls.Add(installButton);
        }

        private void InstallButton_Click(object sender, EventArgs e)
        {
            if (isFinished)
            {
                // Launch App
                string appExe = Path.Combine(installDir, "AI VIDEO LIBRARY.exe");
                if (!File.Exists(appExe)) appExe = Path.Combine(installDir, "AIForge Studio.exe");
                if (File.Exists(appExe))
                {
                    // Bộ cài chạy quyền Administrator. Nếu mở app trực tiếp, app thừa hưởng quyền admin
                    // và Windows chặn Unikey/EVKey (chạy quyền thường) gửi phím vào app -> không gõ được tiếng Việt.
                    // Mở qua explorer.exe để app chạy với quyền người dùng bình thường như khi bấm icon Desktop.
                    // Ưu tiên mở shortcut Start Menu (đã đặt sẵn thư mục làm việc = thư mục cài) giống bấm icon.
                    string launchTarget = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.StartMenu), "Programs", "AI VIDEO LIBRARY.lnk");
                    if (!File.Exists(launchTarget)) launchTarget = appExe;
                    try
                    {
                        Process.Start(new ProcessStartInfo {
                            FileName = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.Windows), "explorer.exe"),
                            Arguments = "\"" + launchTarget + "\"",
                            UseShellExecute = false
                        });
                    }
                    catch
                    {
                        Process.Start(new ProcessStartInfo {
                            FileName = appExe,
                            WorkingDirectory = installDir
                        });
                    }
                }
                Application.Exit();
                return;
            }

            if (isInstalling) return;
            isInstalling = true;
            installButton.Enabled = false;
            desktopShortcutCheck.Enabled = false;
            progressBar.Visible = true;
            progressBar.Value = 5;
            statusLabel.Text = "Đang kiểm tra và đóng các tiến trình cũ...";

            Thread installThread = new Thread(DoInstall);
            installThread.IsBackground = true;
            installThread.Start();
        }

        private void DoInstall()
        {
            try
            {
                // 1. Close all running processes of the app
                KillAllAppProcesses();
                Thread.Sleep(500);

                this.BeginInvoke((MethodInvoker)delegate {
                    progressBar.Value = 10;
                    statusLabel.Text = "Đang chuẩn bị thư mục và giải mã engine trực tiếp từ bộ nhớ...";
                });

                // 2. Prepare install directory
                if (!Directory.Exists(installDir))
                {
                    Directory.CreateDirectory(installDir);
                }

                // 3. Extract directly from embedded resource stream in RAM (NO slow 274MB temp file!)
                Assembly assembly = Assembly.GetExecutingAssembly();
                using (Stream stream = assembly.GetManifestResourceStream("AppPayload.zip"))
                {
                    if (stream == null)
                    {
                        throw new Exception("Không tìm thấy gói dữ liệu AppPayload.zip đính kèm trong Setup!");
                    }

                    using (ZipArchive archive = new ZipArchive(stream, ZipArchiveMode.Read))
                    {
                        int total = archive.Entries.Count;
                        int count = 0;
                        DateTime lastUiUpdate = DateTime.MinValue;

                        foreach (ZipArchiveEntry entry in archive.Entries)
                        {
                            string destinationPath = Path.GetFullPath(Path.Combine(installDir, entry.FullName));
                            if (string.IsNullOrEmpty(entry.Name))
                            {
                                Directory.CreateDirectory(destinationPath);
                            }
                            else
                            {
                                string parentDir = Path.GetDirectoryName(destinationPath);
                                if (!Directory.Exists(parentDir)) Directory.CreateDirectory(parentDir);

                                int retries = 3;
                                while (retries > 0)
                                {
                                    try
                                    {
                                        entry.ExtractToFile(destinationPath, true);
                                        break;
                                    }
                                    catch (IOException)
                                    {
                                        retries--;
                                        if (retries == 0) throw;
                                        KillAllAppProcesses();
                                        Thread.Sleep(400);
                                    }
                                }
                            }

                            count++;

                            // Smooth throttled UI progress updates (every 30 files or 50ms)
                            DateTime now = DateTime.Now;
                            if ((now - lastUiUpdate).TotalMilliseconds > 50 || count == total)
                            {
                                lastUiUpdate = now;
                                int curCount = count;
                                int progressVal = 10 + (int)((float)curCount / total * 80);
                                string fName = Path.GetFileName(entry.FullName);
                                if (string.IsNullOrEmpty(fName)) fName = entry.FullName;
                                if (fName.Length > 35) fName = "..." + fName.Substring(fName.Length - 32);

                                string msg = string.Format("Đang cài đặt ({0}/{1} tệp - {2}%): {3}", curCount, total, progressVal, fName);

                                this.BeginInvoke((MethodInvoker)delegate {
                                    progressBar.Value = Math.Min(progressVal, 90);
                                    statusLabel.Text = msg;
                                });
                            }
                        }
                    }
                }

                this.BeginInvoke((MethodInvoker)delegate {
                    progressBar.Value = 93;
                    statusLabel.Text = "Đang tạo biểu tượng ngoài màn hình Desktop...";
                });

                // 4. Create Desktop Shortcut
                string exePath = Path.Combine(installDir, "AI VIDEO LIBRARY.exe");
                if (!File.Exists(exePath)) exePath = Path.Combine(installDir, "AIForge Studio.exe");

                if (desktopShortcutCheck.Checked)
                {
                    CreateShortcut(
                        Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.Desktop), "AI VIDEO LIBRARY.lnk"),
                        exePath,
                        installDir,
                        "AI VIDEO LIBRARY - Trình Tạo Video AI Veo 3 & Thư Viện AI"
                    );
                }

                // 5. Create Start Menu Shortcut
                string startMenuDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.StartMenu), "Programs");
                CreateShortcut(
                    Path.Combine(startMenuDir, "AI VIDEO LIBRARY.lnk"),
                    exePath,
                    installDir,
                    "AI VIDEO LIBRARY - Trình Tạo Video AI Veo 3 & Thư Viện AI"
                );

                // 5.5. Tự động mở toàn bộ quyền ghi các ổ đĩa và thư mục lưu video
                UnlockDrivesAndDirectories();

                this.BeginInvoke((MethodInvoker)delegate {
                    progressBar.Value = 100;
                    statusLabel.ForeColor = Color.FromArgb(74, 222, 128); // Green 400
                    statusLabel.Text = "✅ Cài đặt hoàn tất 100%! Nhấp nút bên dưới để mở ứng dụng.";
                    installButton.Text = "✨ MỞ AI VIDEO LIBRARY NGAY";
                    installButton.BackColor = Color.FromArgb(16, 185, 129); // Emerald 500
                    installButton.Enabled = true;
                    isFinished = true;
                });
            }
            catch (Exception ex)
            {
                this.BeginInvoke((MethodInvoker)delegate {
                    statusLabel.ForeColor = Color.FromArgb(248, 113, 113); // Red 400
                    statusLabel.Text = "Lỗi cài đặt: " + ex.Message;
                    installButton.Enabled = true;
                    installButton.Text = "THỬ CÀI ĐẶT LẠI";
                    isInstalling = false;
                });
            }
        }

        private void UnlockDrivesAndDirectories()
        {
            try
            {
                // Cấp quyền ghi (Modify) cho Users trên các ổ đĩa cố định (D:, E:, F:, ...)
                foreach (DriveInfo drive in DriveInfo.GetDrives())
                {
                    if (drive.DriveType == DriveType.Fixed && !drive.Name.StartsWith("C", StringComparison.OrdinalIgnoreCase))
                    {
                        string dRoot = drive.Name.TrimEnd('\\') + "\\";
                        try
                        {
                            ProcessStartInfo psi = new ProcessStartInfo("cmd.exe", string.Format("/c icacls \"{0}\" /grant Users:(OI)(CI)M /grant \"Authenticated Users\":(OI)(CI)M", dRoot))
                            {
                                CreateNoWindow = true,
                                UseShellExecute = false,
                                WindowStyle = ProcessWindowStyle.Hidden
                            };
                            using (Process p = Process.Start(psi))
                            {
                                if (p != null) p.WaitForExit(3000);
                            }
                        }
                        catch {}
                    }
                }

                // Cấp quyền Full Control cho các thư mục lưu video/ảnh phổ biến nếu đã tồn tại
                string[] commonDirs = new string[] {
                    @"D:\ảnh", @"D:\video", @"D:\anh", @"D:\videos",
                    @"D:\video đã hoàn thành", @"D:\video da hoan thanh",
                    @"E:\ảnh", @"E:\video", @"E:\anh", @"E:\videos"
                };
                foreach (string cDir in commonDirs)
                {
                    if (Directory.Exists(cDir))
                    {
                        try
                        {
                            ProcessStartInfo psi = new ProcessStartInfo("cmd.exe", string.Format("/c icacls \"{0}\" /grant Users:(OI)(CI)F /T", cDir))
                            {
                                CreateNoWindow = true,
                                UseShellExecute = false,
                                WindowStyle = ProcessWindowStyle.Hidden
                            };
                            using (Process p = Process.Start(psi))
                            {
                                if (p != null) p.WaitForExit(3000);
                            }
                        }
                        catch {}
                    }
                }
            }
            catch {}
        }

        private void KillAllAppProcesses()
        {
            string[] procNames = new string[] { "AI VIDEO LIBRARY", "AIForge Studio", "electron" };
            foreach (string name in procNames)
            {
                try
                {
                    foreach (Process p in Process.GetProcessesByName(name))
                    {
                        try
                        {
                            p.Kill();
                            p.WaitForExit(1500);
                        }
                        catch {}
                    }
                }
                catch {}
            }
        }

        private void CreateShortcut(string shortcutPath, string targetPath, string workingDir, string description)
        {
            try
            {
                Type shellType = Type.GetTypeFromProgID("WScript.Shell");
                dynamic shell = Activator.CreateInstance(shellType);
                dynamic shortcut = shell.CreateShortcut(shortcutPath);
                shortcut.TargetPath = targetPath;
                shortcut.WorkingDirectory = workingDir;
                shortcut.Description = description;
                shortcut.IconLocation = targetPath + ",0";
                shortcut.Save();
            }
            catch {}
        }

        // Drag window support
        public const int WM_NCLBUTTONDOWN = 0xA1;
        public const int HT_CAPTION = 0x2;
        [DllImportAttribute("user32.dll")]
        public static extern int SendMessage(IntPtr hWnd, int Msg, int wParam, int lParam);
        [DllImportAttribute("user32.dll")]
        public static extern bool ReleaseCapture();
    }
}
