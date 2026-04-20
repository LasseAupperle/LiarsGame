/**
 * useKeyboardShortcuts.js - Keyboard shortcuts for PC gaming
 * 1-9: Select card by position
 * Enter: Play selected cards
 * L: Call Liar
 * R: Ready/Next round (if applicable)
 */

import { useEffect } from 'react';
import useGame from './useGame';
import useSound from './useSound';

const useKeyboardShortcuts = () => {
  const {
    selectedCards,
    toggleCard,
    clearSelection,
    isYourTurn,
    emit,
    gameCode,
    playerId,
    players
  } = useGame();
  const { playSound } = useSound();

  const yourHand = players.find(p => p.id === playerId)?.hand || [];

  useEffect(() => {
    const handleKeyPress = (e) => {
      // Only on game view, not in inputs
      if (
        document.activeElement.tagName === 'INPUT' ||
        document.activeElement.tagName === 'TEXTAREA'
      ) {
        return;
      }

      // Number keys 1-9: Select card by position
      if (e.key >= '1' && e.key <= '9') {
        const cardIndex = parseInt(e.key) - 1;
        if (cardIndex < yourHand.length) {
          toggleCard(cardIndex);
          e.preventDefault();
        }
      }

      // Enter: Play selected cards
      if (e.key === 'Enter' && isYourTurn && selectedCards.length > 0) {
        playSound('card-place');
        emit('game:play', gameCode, selectedCards, (response) => {
          if (response.success) {
            clearSelection();
          } else {
            alert('Error: ' + response.message);
          }
        });
        e.preventDefault();
      }

      // L: Call Liar
      if ((e.key === 'l' || e.key === 'L') && !isYourTurn) {
        playSound('liar-call');
        emit('game:callLiar', gameCode, (response) => {
          if (!response.success) {
            alert('Error: ' + response.message);
          }
        });
        e.preventDefault();
      }

      // R: Ready for next round (if applicable)
      if (e.key === 'r' || e.key === 'R') {
        emit('game:nextTurn', gameCode, (response) => {
          if (!response.success) {
            alert('Error: ' + response.message);
          }
        });
        e.preventDefault();
      }

      // C: Copy lobby code
      if (e.key === 'c' || e.key === 'C') {
        if (gameCode) {
          navigator.clipboard.writeText(gameCode);
          alert('Lobby code copied!');
        }
        e.preventDefault();
      }

      // S: Toggle sound
      if (e.key === 's' || e.key === 'S') {
        // Toggle sound via useGame store
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [
    selectedCards,
    toggleCard,
    clearSelection,
    isYourTurn,
    emit,
    gameCode,
    playerId,
    players,
    playSound,
    yourHand.length
  ]);
};

export default useKeyboardShortcuts;
