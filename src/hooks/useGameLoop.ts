import { useEffect, useRef, useCallback, useReducer } from 'react';
import {
  createInitialState, startGame, createPair,
  moveLeft, moveRight, moveDown, rotateCW, rotateCCW,
  lockPair, applyGravity, resolveChains,
  isGameOver, calcLevel, getFallSpeed,
} from '../game/gameLogic';
import { SOFT_DROP_MS, LOCK_DELAY_MS } from '../game/constants';
import type { GameState } from '../game/types';

type Action =
  | { type: 'START' }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'MOVE_LEFT' }
  | { type: 'MOVE_RIGHT' }
  | { type: 'MOVE_DOWN' }
  | { type: 'ROTATE_CW' }
  | { type: 'ROTATE_CCW' }
  | { type: 'TICK' }
  | { type: 'LOCK' }
  | { type: 'RESOLVE_STEP' }
  | { type: 'SPAWN' };

function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'START':
      return startGame(state);

    case 'PAUSE':
      return state.phase === 'falling' ? { ...state, phase: 'paused' } : state;

    case 'RESUME':
      return state.phase === 'paused' ? { ...state, phase: 'falling' } : state;

    case 'MOVE_LEFT': {
      if (state.phase !== 'falling' || !state.currentPair) return state;
      return { ...state, currentPair: moveLeft(state.board, state.currentPair) };
    }

    case 'MOVE_RIGHT': {
      if (state.phase !== 'falling' || !state.currentPair) return state;
      return { ...state, currentPair: moveRight(state.board, state.currentPair) };
    }

    case 'MOVE_DOWN': {
      if (state.phase !== 'falling' || !state.currentPair) return state;
      const { pair, locked } = moveDown(state.board, state.currentPair);
      if (locked) return { ...state, phase: 'locking' };
      return { ...state, currentPair: pair };
    }

    case 'ROTATE_CW': {
      if (state.phase !== 'falling' || !state.currentPair) return state;
      return { ...state, currentPair: rotateCW(state.board, state.currentPair) };
    }

    case 'ROTATE_CCW': {
      if (state.phase !== 'falling' || !state.currentPair) return state;
      return { ...state, currentPair: rotateCCW(state.board, state.currentPair) };
    }

    case 'TICK': {
      if (state.phase !== 'falling' || !state.currentPair) return state;
      const { pair, locked } = moveDown(state.board, state.currentPair);
      if (locked) return { ...state, phase: 'locking' };
      return { ...state, currentPair: pair };
    }

    case 'LOCK': {
      if (!state.currentPair) return state;
      const newBoard = lockPair(state.board, state.currentPair);
      const { board: settled } = applyGravity(newBoard);

      if (isGameOver(settled)) {
        const hs = Math.max(state.score, state.highScore);
        localStorage.setItem('puyoHighScore', String(hs));
        return { ...state, board: settled, currentPair: null, phase: 'gameover', highScore: hs };
      }

      const steps = resolveChains(settled);
      if (steps.length === 0) {
        return { ...state, board: settled, phase: 'spawn' };
      }

      // Store resolve steps - process first one immediately
      const firstStep = steps[0]!;
      return {
        ...state,
        board: firstStep.board,
        popGroups: firstStep.groups,
        chainCount: firstStep.chainCount,
        score: state.score + firstStep.scoreGained,
        highScore: Math.max(state.score + firstStep.scoreGained, state.highScore),
        level: calcLevel(state.score + firstStep.scoreGained),
        chains: state.chains + 1,
        maxChain: Math.max(state.maxChain, firstStep.chainCount),
        phase: 'resolving',
        _resolveSteps: steps.slice(1),
        _resolveStepIndex: 1,
      };
    }

    case 'RESOLVE_STEP': {
      const steps = state._resolveSteps ?? [];
      const idx = state._resolveStepIndex ?? 0;

      if (idx >= steps.length) {
        return { ...state, popGroups: [], phase: 'spawn', _resolveSteps: undefined, _resolveStepIndex: undefined };
      }

      const step = steps[idx]!;
      return {
        ...state,
        board: step.board,
        popGroups: step.groups,
        chainCount: step.chainCount,
        score: state.score + step.scoreGained,
        highScore: Math.max(state.score + step.scoreGained, state.highScore),
        level: calcLevel(state.score + step.scoreGained),
        maxChain: Math.max(state.maxChain, step.chainCount),
        _resolveSteps: steps,
        _resolveStepIndex: idx + 1,
      };
    }

    case 'SPAWN': {
      const current = state.nextPair ?? createPair();
      const next = createPair();
      return { ...state, currentPair: current, nextPair: next, popGroups: [], phase: 'falling' };
    }

    default:
      return state;
  }
}

export function useGameLoop() {
  const [state, dispatch] = useReducer(reducer, undefined, createInitialState);
  const stateRef = useRef(state);
  stateRef.current = state;

  const tickRef = useRef<number | null>(null);
  const lockTimerRef = useRef<number | null>(null);
  const resolveTimerRef = useRef<number | null>(null);

  const clearTimers = useCallback(() => {
    if (tickRef.current !== null) clearInterval(tickRef.current);
    if (lockTimerRef.current !== null) clearTimeout(lockTimerRef.current);
    if (resolveTimerRef.current !== null) clearTimeout(resolveTimerRef.current);
    tickRef.current = null;
    lockTimerRef.current = null;
    resolveTimerRef.current = null;
  }, []);

  // Gravity tick
  useEffect(() => {
    if (state.phase === 'falling') {
      const speed = getFallSpeed(state.level);
      tickRef.current = setInterval(() => dispatch({ type: 'TICK' }), speed) as unknown as number;
    } else {
      if (tickRef.current !== null) { clearInterval(tickRef.current); tickRef.current = null; }
    }
    return () => { if (tickRef.current !== null) clearInterval(tickRef.current); };
  }, [state.phase, state.level]);

  // Lock delay
  useEffect(() => {
    if (state.phase === 'locking') {
      lockTimerRef.current = setTimeout(() => dispatch({ type: 'LOCK' }), LOCK_DELAY_MS) as unknown as number;
    }
    return () => { if (lockTimerRef.current !== null) clearTimeout(lockTimerRef.current); };
  }, [state.phase]);

  // Chain resolution animation timer
  useEffect(() => {
    if (state.phase === 'resolving') {
      resolveTimerRef.current = setTimeout(() => dispatch({ type: 'RESOLVE_STEP' }), 600) as unknown as number;
    }
    return () => { if (resolveTimerRef.current !== null) clearTimeout(resolveTimerRef.current); };
  }, [state.phase]);

  // Spawn after resolve
  useEffect(() => {
    if (state.phase === 'spawn') {
      dispatch({ type: 'SPAWN' });
    }
  }, [state.phase]);

  // Keyboard controls
  useEffect(() => {
    let softDropInterval: number | null = null;

    const onKeyDown = (e: KeyboardEvent) => {
      const phase = stateRef.current.phase;
      switch (e.code) {
        case 'ArrowLeft':  if (phase === 'falling') dispatch({ type: 'MOVE_LEFT' });  break;
        case 'ArrowRight': if (phase === 'falling') dispatch({ type: 'MOVE_RIGHT' }); break;
        case 'ArrowDown':
          if (phase === 'falling') {
            dispatch({ type: 'MOVE_DOWN' });
            softDropInterval = setInterval(() => dispatch({ type: 'MOVE_DOWN' }), SOFT_DROP_MS) as unknown as number;
          }
          break;
        case 'ArrowUp':
        case 'KeyX': if (phase === 'falling') dispatch({ type: 'ROTATE_CW' });  break;
        case 'KeyZ': if (phase === 'falling') dispatch({ type: 'ROTATE_CCW' }); break;
        case 'KeyP':
        case 'Escape':
          if (phase === 'falling') dispatch({ type: 'PAUSE' });
          else if (phase === 'paused') dispatch({ type: 'RESUME' });
          break;
        case 'Enter':
          if (phase === 'menu' || phase === 'gameover') dispatch({ type: 'START' });
          break;
      }
      e.preventDefault();
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'ArrowDown') {
        if (softDropInterval !== null) { clearInterval(softDropInterval); softDropInterval = null; }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      if (softDropInterval !== null) clearInterval(softDropInterval);
      clearTimers();
    };
  }, [clearTimers]);

  return { state, dispatch };
}
