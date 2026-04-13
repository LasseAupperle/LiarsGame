/**
 * Modal.jsx - Generic modal wrapper
 */

import useGame from '../../hooks/useGame';

export default function Modal({ type, title, content, onConfirm, onCancel }) {
  const { closeModal } = useGame();

  const handleConfirm = () => {
    onConfirm?.();
    closeModal();
  };

  const handleCancel = () => {
    onCancel?.();
    closeModal();
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="modal-close" onClick={handleCancel}>
            ×
          </button>
        </div>

        <div className="modal-content">{content}</div>

        <div className="modal-actions">
          {type === 'confirm' && (
            <>
              <button className="btn-primary" onClick={handleConfirm}>
                Confirm
              </button>
              <button className="btn-secondary" onClick={handleCancel}>
                Cancel
              </button>
            </>
          )}
          {type === 'info' && (
            <button className="btn-primary" onClick={handleCancel}>
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
