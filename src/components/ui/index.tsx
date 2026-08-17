/* Design system: "編輯式旅程入口" — shared controls use Journey Yellow only
 * for decisive actions, with Ink Black focus and calm Paper White materials. */
import { ReactNode, ButtonHTMLAttributes, InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, useEffect, useRef } from 'react';
import { X } from 'lucide-react';

// ── Button ─────────────────────────────────────────────────
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  children: ReactNode;
}

export function Button({ variant = 'primary', size = 'md', loading, children, className = '', disabled, ...props }: ButtonProps) {
  const base = 'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-150 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  const variants = {
    primary: 'bg-[#ffc91a] text-[#111111] hover:bg-[#f1b900] focus:ring-[#111111]',
    secondary: 'bg-[#ece7da] text-[#2a2926] hover:bg-[#e1dac9] focus:ring-[#111111]',
    danger: 'bg-red-500 text-white hover:bg-red-600 focus:ring-red-400',
    ghost: 'text-slate-600 hover:bg-[#ece7da] focus:ring-[#111111]',
    outline: 'border border-[#c9c1af] text-slate-700 hover:bg-[#faf8f2] focus:ring-[#111111]',
  };
  const sizes = { sm: 'px-3 py-1.5 text-xs', md: 'px-4 py-2 text-sm', lg: 'px-5 py-2.5 text-base' };
  return (
    <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} disabled={disabled || loading} {...props}>
      {loading && <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />}
      {children}
    </button>
  );
}

// ── Input ──────────────────────────────────────────────────
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  required?: boolean;
}

export function Input({ label, error, required, className = '', id, ...props }: InputProps) {
  const inputId = id || label?.replace(/\s/g, '_');
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-slate-700">
          {label}{required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      <input
        id={inputId}
        className={`w-full min-w-0 px-3 py-2 text-sm border rounded-lg bg-white text-slate-900 placeholder-slate-400
          focus:outline-none focus:ring-2 focus:ring-[#111111] focus:border-transparent
          disabled:bg-slate-50 disabled:text-slate-500
          ${props.type === 'date' ? 'appearance-none' : ''}
          ${error ? 'border-red-400' : 'border-[#c9c1af]'}
          ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

// ── Select ─────────────────────────────────────────────────
interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  required?: boolean;
  options: Array<{ value: string; label: string }>;
}

export function Select({ label, error, required, options, className = '', id, ...props }: SelectProps) {
  const selectId = id || label?.replace(/\s/g, '_');
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={selectId} className="text-sm font-medium text-slate-700">
          {label}{required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      <select
        id={selectId}
        className={`w-full px-3 py-2 text-sm border rounded-lg bg-white text-slate-900
          focus:outline-none focus:ring-2 focus:ring-[#111111] focus:border-transparent
          ${error ? 'border-red-400' : 'border-[#c9c1af]'}
          ${className}`}
        {...props}
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

// ── Textarea ───────────────────────────────────────────────
interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  required?: boolean;
}

export function Textarea({ label, error, required, className = '', id, ...props }: TextareaProps) {
  const textareaId = id || label?.replace(/\s/g, '_');
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={textareaId} className="text-sm font-medium text-slate-700">
          {label}{required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      <textarea
        id={textareaId}
        className={`w-full px-3 py-2 text-sm border rounded-lg bg-white text-slate-900 placeholder-slate-400
          focus:outline-none focus:ring-2 focus:ring-[#111111] focus:border-transparent resize-y
          ${error ? 'border-red-400' : 'border-[#c9c1af]'}
          ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

// ── Modal ──────────────────────────────────────────────────
interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function Modal({ open, onClose, title, children, footer, size = 'md' }: ModalProps) {
  const scrollYRef = useRef<number>(0);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      // Save scroll position and lock body scroll
      scrollYRef.current = window.scrollY;
      document.body.style.overflow = 'hidden';

      // Focus the modal container for keyboard events
      setTimeout(() => modalRef.current?.focus(), 50);
    } else {
      // Restore body scroll and scroll position
      document.body.style.overflow = '';
      const saved = scrollYRef.current;
      requestAnimationFrame(() => {
        window.scrollTo({ top: saved, behavior: 'instant' as ScrollBehavior });
      });
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  // ESC key to close
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;
  const sizes = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg', xl: 'max-w-2xl' };
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        ref={modalRef}
        tabIndex={-1}
        className={`relative w-full ${sizes[size]} bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92dvh] sm:max-h-[90vh] outline-none`}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 id="modal-title" className="text-base font-semibold text-slate-900">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors" aria-label="關閉">
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4">{children}</div>
        {footer && <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}

// ── Card ───────────────────────────────────────────────────
export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-[1.25rem] border border-[#e3ddcf] shadow-[0_12px_28px_rgba(17,17,17,0.06)] ${className}`}>
      {children}
    </div>
  );
}

// ── Badge ──────────────────────────────────────────────────
interface BadgeProps {
  children: ReactNode;
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'slate';
}

export function Badge({ children, color = 'blue' }: BadgeProps) {
  const colors = {
    blue: 'bg-blue-100 text-blue-700',
    green: 'bg-emerald-100 text-emerald-700',
    yellow: 'bg-amber-100 text-amber-700',
    red: 'bg-red-100 text-red-700',
    purple: 'bg-purple-100 text-purple-700',
    slate: 'bg-slate-100 text-slate-600',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colors[color]}`}>
      {children}
    </span>
  );
}

// ── Loading Spinner ────────────────────────────────────────
export function Spinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8' };
  return (
    <div className={`${sizes[size]} border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin`} />
  );
}

// ── Empty State ────────────────────────────────────────────
export function EmptyState({ icon, title, description, action }: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      {icon && <div className="mb-4 text-slate-300">{icon}</div>}
      <h3 className="text-base font-semibold text-slate-700 mb-1">{title}</h3>
      {description && <p className="text-sm text-slate-500 mb-4">{description}</p>}
      {action}
    </div>
  );
}

// ── Confirm Dialog ─────────────────────────────────────────
export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmText = '確認刪除', loading }: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  loading?: boolean;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>取消</Button>
          <Button variant="danger" onClick={onConfirm} loading={loading}>{confirmText}</Button>
        </>
      }
    >
      <p className="text-sm text-slate-600">{message}</p>
    </Modal>
  );
}

// ── Tab Bar ────────────────────────────────────────────────
export function TabBar({ tabs, activeTab, onChange }: {
  tabs: Array<{ id: string; label: string; icon?: ReactNode }>;
  activeTab: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex border-b border-slate-200 bg-white overflow-x-auto scrollbar-hide">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`flex items-center gap-2 px-4 sm:px-5 py-3 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex-shrink-0
            ${activeTab === tab.id
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          role="tab"
          aria-selected={activeTab === tab.id}
        >
          {tab.icon}
          {tab.label}
        </button>
      ))}
    </div>
  );
}
