import { useTheme } from '../contexts/ThemeContext'

export default function ThemeToggle() {
  const { theme, toggle } = useTheme()

  return (
    <button className="theme-toggle" onClick={toggle} title={theme === 'light' ? 'Dark mode' : 'Light mode'}>
      {theme === 'light' ? '🌙' : '☀️'}
    </button>
  )
}
