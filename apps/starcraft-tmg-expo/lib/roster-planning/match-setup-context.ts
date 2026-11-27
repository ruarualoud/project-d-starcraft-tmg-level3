import { createContext, useContext } from 'react';
import { rosterPlanningClient } from './roster-planning-client-v1';

export const MatchPlanningClientContext = createContext(rosterPlanningClient);
export function useMatchPlanningClient() {
  return useContext(MatchPlanningClientContext);
}
