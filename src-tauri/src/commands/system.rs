use std::process::Command;
use std::fs;
use tauri::{State, AppHandle};
use crate::state::AppState;
use base64::{engine::general_purpose, Engine as _};
use image::{ImageOutputFormat};
use std::io::Cursor;
use serde::Serialize;
use std::path::Path;
use std::env;

#[derive(Serialize)]
pub struct ScannedImage {
    pub filename: String,
    pub data_base64: String,
    pub mime: String,
}

#[derive(Serialize)]
pub struct ScannerInfo {
    pub id: String,
    pub name: String,
}

#[tauri::command]
pub async fn open_url_in_chrome(_state: State<'_, AppState>, url: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        let candidates = vec![
            r"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
            r"C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
        ];

        for path in candidates {
            if std::path::Path::new(path).exists() {
                return Command::new(path)
                    .arg("--new-window")
                    .arg(&url)
                    .spawn()
                    .map_err(|e| format!("Failed to launch Chrome: {}", e))
                    .map(|_| ());
            }
        }

        return Command::new("cmd")
            .args(["/C", "start", "", &url])
            .spawn()
            .map_err(|e| format!("Failed to open URL: {}", e))
            .map(|_| ());
    }

    #[cfg(target_os = "macos")]
    {
        let status = Command::new("open")
            .args(["-a", "Google Chrome", &url])
            .status()
            .map_err(|e| format!("Failed to run open: {}", e))?;
        if status.success() {
            return Ok(());
        }
        Command::new("open")
            .arg(&url)
            .spawn()
            .map_err(|e| format!("Failed to open URL: {}", e))
            .map(|_| ())
    }

    #[cfg(target_os = "linux")]
    {
        let candidates = vec!["google-chrome", "google-chrome-stable", "chromium", "chromium-browser"];
        for bin in candidates {
            if which::which(bin).is_ok() {
                return Command::new(bin)
                    .arg(&url)
                    .spawn()
                    .map_err(|e| format!("Failed to launch {}: {}", bin, e))
                    .map(|_| ());
            }
        }
        Command::new("xdg-open")
            .arg(&url)
            .spawn()
            .map_err(|e| format!("Failed to open URL: {}", e))
            .map(|_| ())
    }
}

#[tauri::command]
pub async fn scan_artwork(_state: State<'_, AppState>) -> Result<Vec<ScannedImage>, String> {
    #[cfg(not(target_os = "windows"))]
    {
        return Err("Scanning is currently supported on Windows only.".to_string());
    }

    #[cfg(target_os = "windows")]
    {
        let script = r#"
            $ErrorActionPreference = 'Stop'
            Add-Type -AssemblyName System.Drawing
            Add-Type @"
using System;
using System.Runtime.InteropServices;
public class Win {
  [DllImport("user32.dll")]
  public static extern bool SetForegroundWindow(IntPtr hWnd);
  [DllImport("user32.dll")]
  public static extern bool ShowWindowAsync(IntPtr hWnd, int nCmdShow);
  [DllImport("user32.dll")]
  public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);
  public static readonly IntPtr HWND_TOPMOST = new IntPtr(-1);
  public static readonly IntPtr HWND_NOTOPMOST = new IntPtr(-2);
}
"@
            $null = [Win]::SetForegroundWindow((Get-Process -Id $PID).MainWindowHandle)
            $null = [Win]::ShowWindowAsync((Get-Process -Id $PID).MainWindowHandle, 5)
            $null = [Win]::SetWindowPos((Get-Process -Id $PID).MainWindowHandle, [Win]::HWND_TOPMOST, 0,0,0,0, 0x0003)
            $dialog = New-Object -ComObject WIA.CommonDialog
            $image = $dialog.ShowAcquireImage()
            if ($null -eq $image) { exit 0 }            # Convert to PNG to avoid format mismatches
            $convertFilterId = "{B96B3CAF-0728-11D3-9D7B-0000F81EF32E}" # PNG
            $imgProcess = New-Object -ComObject WIA.ImageProcess
            $imgProcess.Filters.Add($imgProcess.FilterInfos["Convert"].FilterID) | Out-Null
            $imgProcess.Filters[1].Properties["FormatID"].Value = $convertFilterId
            $converted = $imgProcess.Apply($image)

            $ext = '.png'
            $name = 'scan_' + [guid]::NewGuid().ToString() + $ext
            $path = Join-Path $env:TEMP $name
            $converted.SaveFile($path)
            $path
        "#;

        let output = Command::new("powershell")
            .args([
                "-NoLogo",
                "-NoProfile",
                "-Sta",
                "-ExecutionPolicy",
                "Bypass",
                "-Command",
                script
            ])
            .output()
            .map_err(|e| format!("Failed to launch PowerShell for scanning: {}", e))?;        if !output.status.success() {
            return Err(format!(
                "Scanner wizard failed: {}",
                String::from_utf8_lossy(&output.stderr)
            ));
        }

        let stdout = String::from_utf8_lossy(&output.stdout);
        let mut scans: Vec<ScannedImage> = Vec::new();

        for line in stdout.lines() {
            let trimmed = line.trim();
            if trimmed.is_empty() {
                continue;
            }
            let path = std::path::Path::new(trimmed);
            if !path.exists() {
                continue;
            }
            let data = fs::read(path)
                .map_err(|e| format!("Failed to read scanned file {}: {}", trimmed, e))?;
            let encoded = general_purpose::STANDARD.encode(&data);
            let mime = if let Some(ext) = path.extension().and_then(|s| s.to_str()) {
                match ext.to_ascii_lowercase().as_str() {
                    "jpg" | "jpeg" => "image/jpeg",
                    "png" => "image/png",
                    _ => "image/jpeg",
                }
            } else {
                "image/jpeg"
            }
            .to_string();

            let filename = path
                .file_name()
                .and_then(|s| s.to_str())
                .unwrap_or("scan.jpg")
                .to_string();

            scans.push(ScannedImage {
                filename,
                data_base64: encoded,
                mime,
            });

            let _ = fs::remove_file(path);
        }        if scans.is_empty() {
            return Err("No images were returned from the scanner.".to_string());
        }        Ok(scans)
    }
}

#[tauri::command]
pub async fn list_scanners(_state: State<'_, AppState>) -> Result<Vec<ScannerInfo>, String> {
    #[cfg(not(target_os = "windows"))]
    {
        return Err("Listing scanners is supported on Windows only.".to_string());
    }

    #[cfg(target_os = "windows")]
    {
        let script = r#"
            $ErrorActionPreference = 'Stop'
            $dm = New-Object -ComObject WIA.DeviceManager
            $out = @()
            foreach ($info in $dm.DeviceInfos) {
              if ($info.Type -eq 1) { # Scanner
                $out += ($info.DeviceID + '|' + $info.Properties["Name"].Value)
              }
            }
            $out -join "`n"
        "#;        let output = Command::new("powershell")
            .args([
                "-NoLogo",
                "-NoProfile",
                "-Sta",
                "-ExecutionPolicy",
                "Bypass",
                "-Command",
                script
            ])
            .output()
            .map_err(|e| format!("Failed to enumerate scanners: {}", e))?;

        if !output.status.success() {
            return Err(format!(
                "Scanner listing failed: {}",
                String::from_utf8_lossy(&output.stderr)
            ));
        }        let stdout = String::from_utf8_lossy(&output.stdout);
        let mut scanners = Vec::new();
        for line in stdout.lines() {
            if let Some((id, name)) = line.split_once('|') {
                scanners.push(ScannerInfo {
                    id: id.trim().to_string(),
                    name: name.trim().to_string(),
                });
            }
        }

        Ok(scanners)
    }
}

#[tauri::command]
pub async fn list_warmups(app: AppHandle, state: State<'_, AppState>) -> Result<Vec<String>, String> {
    // Search priority:
    // 1) DataRoot/warmups
    // 2) DataRoot/library/warmups (if seeded there)
    // 3) CWD ancestor chain /library/warmups (dev)
    // 4) Executable dir ancestor chain /library/warmups (portable)
    // 5) Project root (compile-time) /library/warmups (dev, reliable)
    // 6) Bundled resource library (resource_dir/library or _up_/library or resolve_resource)
    let mut candidates: Vec<std::path::PathBuf> = Vec::new();

    candidates.push(state.data_dir.join("warmups"));
    candidates.push(state.data_dir.join("library").join("warmups"));

    // Walk ancestors to find /library/warmups starting from cwd
    if let Ok(cwd) = env::current_dir() {
        for dir in cwd.ancestors() {
            candidates.push(dir.join("library").join("warmups"));
            candidates.push(dir.join("dist").join("library").join("warmups"));
        }
    }

    // Walk ancestors from executable directory (portable)
    if let Ok(exe) = env::current_exe() {
        if let Some(exe_dir) = exe.parent() {
            for dir in exe_dir.ancestors() {
                candidates.push(dir.join("library").join("warmups"));
                candidates.push(dir.join("dist").join("library").join("warmups"));
            }
        }
    }

    // Compile-time project root (src-tauri/Cargo manifest is one level down)
    if let Some(proj_root) = Path::new(env!("CARGO_MANIFEST_DIR")).parent() {
        candidates.push(proj_root.join("library").join("warmups"));
        candidates.push(proj_root.join("dist").join("library").join("warmups"));
    }

    let resolver = app.path_resolver();
    if let Some(p) = resolver.resolve_resource("library/warmups") {
        candidates.push(p);
    }
    if let Some(res_dir) = resolver.resource_dir() {
        candidates.push(res_dir.join("library").join("warmups"));
        candidates.push(res_dir.join("_up_").join("library").join("warmups"));
    }

    let dir = candidates.into_iter().find(|p| p.is_dir())
        .ok_or_else(|| "Warmups folder not found".to_string())?;

    println!("list_warmups using directory: {:?}", dir);

    let mut files: Vec<String> = Vec::new();
    for entry in std::fs::read_dir(&dir).map_err(|e| format!("Failed to read warmups dir: {}", e))? {
        let entry = entry.map_err(|e| format!("Dir entry error: {}", e))?;
        let path = entry.path();
        if path.is_file() {
            if let Some(ext) = path.extension().and_then(|s| s.to_str()) {
                let ext_lc = ext.to_ascii_lowercase();
                if ext_lc == "png" || ext_lc == "jpg" || ext_lc == "jpeg" || ext_lc == "webp" {
                    let rel = path.strip_prefix(&dir).unwrap_or(&path);
                    let rel_str = rel.to_string_lossy().replace("\\", "/");
                    files.push(format!("library/warmups/{}", rel_str));
                }
            }
        }
    }

    if files.is_empty() {
        return Err("No warmup images found".to_string());
    }

    Ok(files)
}#[tauri::command]
pub async fn get_warmup_image_data(
    app: AppHandle,
    state: State<'_, AppState>,
    filename: String,
) -> Result<String, String> {
    // Use same search logic as list_warmups to find the warmups directory
    let mut candidates: Vec<std::path::PathBuf> = Vec::new();

    candidates.push(state.data_dir.join("warmups"));
    candidates.push(state.data_dir.join("library").join("warmups"));

    if let Ok(cwd) = env::current_dir() {
        for dir in cwd.ancestors() {
            candidates.push(dir.join("library").join("warmups"));
            candidates.push(dir.join("dist").join("library").join("warmups"));
        }
    }

    if let Ok(exe) = env::current_exe() {
        if let Some(exe_dir) = exe.parent() {
            for dir in exe_dir.ancestors() {
                candidates.push(dir.join("library").join("warmups"));
                candidates.push(dir.join("dist").join("library").join("warmups"));
            }
        }
    }

    if let Some(proj_root) = Path::new(env!("CARGO_MANIFEST_DIR")).parent() {
        candidates.push(proj_root.join("library").join("warmups"));
        candidates.push(proj_root.join("dist").join("library").join("warmups"));
    }    let resolver = app.path_resolver();
    if let Some(p) = resolver.resolve_resource("library/warmups") {
        candidates.push(p);
    }
    if let Some(res_dir) = resolver.resource_dir() {
        candidates.push(res_dir.join("library").join("warmups"));
        candidates.push(res_dir.join("_up_").join("library").join("warmups"));
    }

    let dir = candidates.into_iter().find(|p| p.is_dir())
        .ok_or_else(|| "Warmups folder not found".to_string())?;

    let image_path = dir.join(&filename);
    
    if !image_path.exists() {
        return Err(format!("Warmup image not found: {:?}", image_path));
    }

    let file_data = fs::read(&image_path)
        .map_err(|e| format!("Failed to read warmup image: {}", e))?;

    let mime_type = match image_path.extension().and_then(|ext| ext.to_str()) {
        Some("jpg") | Some("jpeg") => "image/jpeg",
        Some("png") => "image/png",
        Some("webp") => "image/webp",
        Some("gif") => "image/gif",
        _ => "image/jpeg",
    };    let base64_data = base64::engine::general_purpose::STANDARD.encode(&file_data);
    let data_url = format!("data:{};base64,{}", mime_type, base64_data);

    Ok(data_url)
}

#[tauri::command]
pub async fn scan_with_device(
    _state: State<'_, AppState>,
    device_id: String,
    page_size: Option<String>,
    dpi: Option<i32>,
) -> Result<ScannedImage, String> {
    #[cfg(not(target_os = "windows"))]
    {
        return Err("Scanning is supported on Windows only.".to_string());
    }

    #[cfg(target_os = "windows")]
    {
        let page = page_size.unwrap_or_else(|| "A4".to_string());
        let color = "COLOR".to_string(); // default color
        let dpi_val = dpi.unwrap_or(300).max(75).min(1200);        let script = format!(
            r#"
            $ErrorActionPreference = 'Stop'
            Add-Type -AssemblyName System.Drawing
            Add-Type @"
using System;
using System.Runtime.InteropServices;
public class Win {{
  [DllImport("user32.dll")]
  public static extern bool SetForegroundWindow(IntPtr hWnd);
  [DllImport("user32.dll")]
  public static extern bool ShowWindowAsync(IntPtr hWnd, int nCmdShow);
  [DllImport("user32.dll")]
  public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);
  public static readonly IntPtr HWND_TOPMOST = new IntPtr(-1);
  public static readonly IntPtr HWND_NOTOPMOST = new IntPtr(-2);
}}
"@
            $null = [Win]::SetForegroundWindow((Get-Process -Id $PID).MainWindowHandle)
            $null = [Win]::ShowWindowAsync((Get-Process -Id $PID).MainWindowHandle, 5)
            $null = [Win]::SetWindowPos((Get-Process -Id $PID).MainWindowHandle, [Win]::HWND_TOPMOST, 0,0,0,0, 0x0003)
            $dm = New-Object -ComObject WIA.DeviceManager
            $dev = $dm.DeviceInfos | Where-Object {{ $_.DeviceID -eq '{device}' }}
            if (-not $dev) {{ exit 0 }}
            $device = $dev.Connect()

            # Configure page size at 300 DPI
            $dpi = {dpi}
            $size = "{page}"
            $mode = "{color}"
            switch ($size.ToUpper()) {{
              "A5" {{
                $widthPx  = [int](5.83 * $dpi)   # 148mm
                $heightPx = [int](8.27 * $dpi)   # 210mm
              }}
              default {{
                $widthPx  = [int](8.27 * $dpi)   # 210mm (A4)
                $heightPx = [int](11.69 * $dpi)  # 297mm
              }}
            }}
            $item = $device.Items[1]
            $intent = if ($mode.ToUpper() -eq "GRAYSCALE") {{ 0x2 }} else {{ 0x1 }}  # WIA_INTENT_IMAGE_TYPE_GRAYSCALE or COLOR
            try {{
              $item.Properties["3096"].Value = 0           # WIA_IPS_PAGE_SIZE (Custom)
              $item.Properties["6147"].Value = $dpi   # WIA_IPS_XRES
              $item.Properties["6148"].Value = $dpi   # WIA_IPS_YRES
              $item.Properties["6149"].Value = 0      # WIA_IPS_XPOS
              $item.Properties["6150"].Value = 0      # WIA_IPS_YPOS
              $item.Properties["6151"].Value = $widthPx  # WIA_IPS_XEXTENT
              $item.Properties["6152"].Value = $heightPx # WIA_IPS_YEXTENT
              $item.Properties["6146"].Value = $intent # WIA_IPS_CUR_INTENT
            }} catch {{}}

            # Use CommonDialog to perform transfer with JPEG format
            $convertFilterId = "{{B96B3CAA-0728-11D3-9D7B-0000F81EF32E}}"
            $common = New-Object -ComObject WIA.CommonDialog
            $image = $common.ShowTransfer($item, $convertFilterId)
            if ($null -eq $image) {{ exit 0 }}

            $ext = '.jpg'
            $name = 'scan_' + [guid]::NewGuid().ToString() + $ext
            $path = Join-Path $env:TEMP $name
            $image.SaveFile($path)
            $path
        "#,
            device = device_id.replace('\'', "''"),
            dpi = dpi_val
        );

        let output = Command::new("powershell")
            .args([
                "-NoLogo",
                "-NoProfile",
                "-Sta",
                "-ExecutionPolicy",
                "Bypass",
                "-Command",
                &script
            ])
            .output()
            .map_err(|e| format!("Failed to launch PowerShell for scanning: {}", e))?;

        if !output.status.success() {
            return Err(format!(
                "Scanner capture failed: {}",
                String::from_utf8_lossy(&output.stderr)
            ));
        }

        let stdout = String::from_utf8_lossy(&output.stdout);
        let path_line = stdout.lines().next().unwrap_or_default().trim().to_string();
        if path_line.is_empty() {
            return Err("No image captured.".to_string());
        }
        let path = std::path::Path::new(&path_line);
        if !path.exists() {
            return Err("Scanned file not found.".to_string());
        }

        let data = fs::read(path)
            .map_err(|e| format!("Failed to read scanned file {}: {}", path_line, e))?;

        // Ensure JPEG encoding regardless of WIA output (some devices return BMP bytes even with a JPG extension)
        let mut jpeg_buf: Vec<u8> = Vec::new();
        let jpeg_encoded = match image::load_from_memory(&data) {
            Ok(img) => img.write_to(&mut Cursor::new(&mut jpeg_buf), ImageOutputFormat::Jpeg(90)),
            Err(_) => Err(image::ImageError::IoError(std::io::Error::new(
                std::io::ErrorKind::Other,
                "decode failed",
            ))),
        };        let (encoded_bytes, mime) = if jpeg_encoded.is_ok() {
            (jpeg_buf, "image/jpeg".to_string())
        } else {
            // Fallback to original data
            (data, "image/jpeg".to_string())
        };        let encoded = general_purpose::STANDARD.encode(&encoded_bytes);
        let filename = path
            .file_name()
            .and_then(|s| s.to_str())
            .unwrap_or("scan.jpg")
            .to_string();        let _ = fs::remove_file(path);        Ok(ScannedImage {
            filename,
            data_base64: encoded,
            mime,
        })
    }
}
