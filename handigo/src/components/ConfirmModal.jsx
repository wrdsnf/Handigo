import { useState } from 'react';
import { X } from 'lucide-react';

/**
 * ConfirmModal — themed confirmation dialog.
 * 
 * Props:
 *   open       - boolean, whether the modal is visible
 *   onClose    - function, called when user cancels / clicks overlay
 *   onConfirm  - function, called when user clicks confirm
 *   title      - string, modal title
 *   message    - string, body text
 *   confirmText - string (default "Konfirmasi")
 *   cancelText  - string (default "Batal")
 *   variant     - 'danger' | 'warning' | 'default'
 */
const ConfirmModal = ({
  open,
  onClose,
  onConfirm,
  title = 'Konfirmasi',
  message = 'Apakah kamu yakin?',
  confirmText = 'Konfirmasi',
  cancelText = 'Batal',
  variant = 'default',
}) => {
  if (!open) return null;

  const confirmColors = {
    danger: 'bg-red-500 hover:bg-red-600 text-white',
    warning: 'bg-yellow-500 hover:bg-yellow-600 text-white',
    default: 'bg-primary-blue hover:bg-primary-hover text-white',
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 animate-in">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X size={20} />
        </button>

        {/* Title */}
        <h3 className="text-lg font-bold text-gray-900 mb-2 pr-6">
          {title}
        </h3>

        {/* Message */}
        <p className="text-sm text-gray-600 mb-6 leading-relaxed">
          {message}
        </p>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-full text-sm font-semibold border border-gray-300 text-gray-700 hover:bg-gray-50 active:scale-95 transition-all"
          >
            {cancelText}
          </button>
          <button
            onClick={() => { onConfirm(); onClose(); }}
            className={`flex-1 px-4 py-2.5 rounded-full text-sm font-semibold active:scale-95 transition-all ${confirmColors[variant]}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * useConfirm — hook that returns [ConfirmModal, confirm(options)]
 * 
 * Usage:
 *   const [ConfirmDialog, confirm] = useConfirm();
 *   
 *   const handleDelete = async () => {
 *     const ok = await confirm({ title: '...', message: '...' });
 *     if (ok) { // proceed }
 *   };
 * 
 *   return <>{ConfirmDialog}</>; // render in JSX
 */
export const useConfirm = () => {
  const [state, setState] = useState({
    open: false,
    title: '',
    message: '',
    confirmText: 'Konfirmasi',
    cancelText: 'Batal',
    variant: 'default',
    resolve: null,
  });

  const confirm = (options = {}) => {
    return new Promise((resolve) => {
      setState({
        open: true,
        title: options.title || 'Konfirmasi',
        message: options.message || 'Apakah kamu yakin?',
        confirmText: options.confirmText || 'Konfirmasi',
        cancelText: options.cancelText || 'Batal',
        variant: options.variant || 'default',
        resolve,
      });
    });
  };

  const handleClose = () => {
    state.resolve?.(false);
    setState(s => ({ ...s, open: false, resolve: null }));
  };

  const handleConfirm = () => {
    state.resolve?.(true);
    setState(s => ({ ...s, open: false, resolve: null }));
  };

  const dialog = (
    <ConfirmModal
      open={state.open}
      onClose={handleClose}
      onConfirm={handleConfirm}
      title={state.title}
      message={state.message}
      confirmText={state.confirmText}
      cancelText={state.cancelText}
      variant={state.variant}
    />
  );

  return [dialog, confirm];
};

export default ConfirmModal;
