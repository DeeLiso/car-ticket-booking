# Responsive + i18n audit via agent-browser
# Usage: .\audit-routes.ps1
$BASE = "http://localhost:5173"
$TRIP = "0a902b274086409ab065928acd6b4981"
$ROUTES = @("/", "/about", "/cookies", "/calendar", "/booking", "/search", "/trips/$TRIP", "/login", "/register", "/notfound-xyz")
$VIEWPORTS = @(@("mobile", 390, 844), @("desktop", 1280, 800))
$LANGS = @("my", "en")

$AUDIT_JS = @'
() => {
  const de = document.documentElement;
  const overX = de.scrollWidth - de.clientWidth;
  const overEls = [];
  if (overX > 1) {
    document.querySelectorAll("body *").forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.right > de.clientWidth + 2) {
        overEls.push(el.tagName + "." + (el.className || "").toString().slice(0, 45) + " r=" + Math.round(r.right));
      }
    });
  }
  const clipped = [];
  document.querySelectorAll("body *").forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.height > 0 && r.height < 3000) {
      const cs = getComputedStyle(el);
      if (el.scrollHeight > el.clientHeight + 2 && el.clientHeight > 0) {
        const cls = (el.className || "").toString();
        // skip sr-only / visually-hidden a11y elements (e.g. skip-link) — clipped by design
        const isSrOnly = /sr-only|visually-hidden/i.test(cls) || cs.clip === "rect(0px, 0px, 0px, 0px)";
        if (!isSrOnly && cs.overflowY === "hidden" && el.children.length === 0 && (el.textContent || "").trim().length > 20) {
          clipped.push((el.textContent || "").trim().slice(0, 40));
        }
      }
    }
  });
  const tiny = [];
  document.querySelectorAll("button,a[href],input,select,textarea").forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0 && r.height < 40) {
      tiny.push(Math.round(r.width) + "x" + Math.round(r.height) + ' "' + (el.innerText || el.getAttribute("aria-label") || el.placeholder || "").trim().slice(0, 24) + '"');
    }
  });
  const raw = (document.body.innerText.match(/\b[a-z][a-zA-Z]*\.[a-zA-Z][a-zA-Z]*\b/g) || []).filter((s) => !["tmax", "gmail", "com"].includes(s.split(".")[1]));
  return { overX, overEls, clipped, tiny, raw: [...new Set(raw)], lang: de.lang };
}
'@
Set-Content -Path "$env:TEMP\audit_fn.js" -Value $AUDIT_JS -Encoding UTF8

$issues = 0
$total = 0
foreach ($vp in $VIEWPORTS) {
  $vpName = $vp[0]; $w = $vp[1]; $h = $vp[2]
  foreach ($lang in $LANGS) {
    # seed language + viewport
    agent-browser set viewport $w $h | Out-Null
    agent-browser open "$BASE/" | Out-Null
    Start-Sleep -Milliseconds 400
    agent-browser eval "localStorage.setItem('tmax.lang','$lang')" | Out-Null
    foreach ($route in $ROUTES) {
      $total++
      agent-browser open "$BASE$route" | Out-Null
      Start-Sleep -Milliseconds 900
      # --stdin is unreliable for eval results; encode as base64 so eval -b handles it.
      # The file is a bare arrow fn — wrap it in an IIFE so it actually executes.
      $iife = "((" + (Get-Content "$env:TEMP\audit_fn.js" -Raw).Trim() + ")())"
      $b64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($iife))
      $out = agent-browser eval -b $b64 2>&1
      try {
        $r = $out | ConvertFrom-Json
      } catch {
        Write-Host "[$vpName/$lang] $route => PARSE FAIL: $out"
        continue
      }
      $flags = @()
      if ($r.overX -gt 1) { $flags += "OVERFLOW-X $($r.overX)" }
      if ($r.overEls -and $r.overEls.Count) { $flags += "OVERELS $($r.overEls[0..([Math]::Min(2,$r.overEls.Count-1))] -join ' | ')" }
      if ($r.clipped -and $r.clipped.Count) { $flags += "CLIPPED $($r.clipped[0..([Math]::Min(3,$r.clipped.Count-1))] -join ' | ')" }
      if ($r.tiny -and $r.tiny.Count) { $flags += "TINY $($r.tiny[0..([Math]::Min(5,$r.tiny.Count-1))] -join ' | ')" }
      if ($r.raw -and $r.raw.Count) { $flags += "RAWKEYS $($r.raw[0..([Math]::Min(5,$r.raw.Count-1))] -join ' | ')" }
      if ($flags.Count) {
        $issues++
        Write-Host "[$vpName/$lang] $route"
        foreach ($f in $flags) { Write-Host "    $f" }
      }
    }
  }
}
Write-Host ""
Write-Host "=== $total page-checks, $issues with issues ==="
