import React from 'react'

interface ToolbarProps {
  onToggleSidebar: () => void
}

const Toolbar: React.FC<ToolbarProps> = ({ onToggleSidebar }) => {
  return (
    <header className="toolbar">
      <button className="ghost-btn" onClick={onToggleSidebar} title="Меню">
        ☰
      </button>

      <div className="filters">
        <label>
          Период
          <input type="date" />
          <span>—</span>
          <input type="date" />
        </label>

        <label>
          Магазин
          <select>
            <option>WB Мухаммед</option>
            <option>WB Магазин 2</option>
          </select>
        </label>

        <button className="primary">Показать</button>
      </div>

      <div className="auth">
        <button className="ghost-btn">Настройки</button>
        <button className="danger">Выйти</button>
      </div>
    </header>
  )
}

export default Toolbar
