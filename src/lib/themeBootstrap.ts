export function applyStoredTheme() {
  try {
    const stored = window.localStorage.getItem('lumos_app_theme');
    const theme = stored === 'light' || stored === 'dark' ? stored : 'dark';
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.classList.toggle('dark', theme === 'dark');
    root.style.colorScheme = theme;
  } catch {
    document.documentElement.dataset.theme = 'dark';
    document.documentElement.classList.add('dark');
    document.documentElement.style.colorScheme = 'dark';
  }
}
