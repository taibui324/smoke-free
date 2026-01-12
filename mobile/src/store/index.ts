import { configureStore } from '@reduxjs/toolkit';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import authReducer from './slices/authSlice';
import quitPlanReducer from './slices/quitPlanSlice';
import statisticsReducer from './slices/statisticsSlice';
import cravingReducer from './slices/cravingSlice';
import chatReducer from './slices/chatSlice';
import milestoneReducer from './slices/milestoneSlice';
import resourceReducer from './slices/resourceSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    quitPlan: quitPlanReducer,
    statistics: statisticsReducer,
    craving: cravingReducer,
    chat: chatReducer,
    milestone: milestoneReducer,
    resource: resourceReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types
        ignoredActions: ['auth/register/fulfilled', 'auth/login/fulfilled'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Typed hooks
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
