import React, { createContext, useContext, useReducer, useEffect } from 'react';

const AppContext = createContext(null);

const initialState = {
  prayerTimes:  null,
  location:     null,
  monthlyTimes: null,
  settings: {
    calculationMethod: 3,
    notificationsEnabled: true,
  },
  isLoading: false,
  error:     null,
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_PRAYER_TIMES':  return { ...state, prayerTimes: action.payload };
    case 'SET_MONTHLY_TIMES': return { ...state, monthlyTimes: action.payload };
    case 'SET_LOCATION':      return { ...state, location: action.payload };
    case 'SET_SETTINGS':      return { ...state, settings: { ...state.settings, ...action.payload } };
    case 'SET_LOADING':       return { ...state, isLoading: action.payload };
    case 'SET_ERROR':         return { ...state, error: action.payload };
    default: return state;
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState, (init) => {
    try {
      const saved = JSON.parse(localStorage.getItem('salatState') || '{}');
      return {
        ...init,
        location: saved.location || null,
        settings: { ...init.settings, ...(saved.settings || {}) },
      };
    } catch { return init; }
  });

  useEffect(() => {
    localStorage.setItem('salatState', JSON.stringify({
      location: state.location,
      settings: state.settings,
    }));
  }, [state.location, state.settings]);

  return (
    <AppContext.Provider value={{ ...state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
