import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import type { ApplicationState } from './initialApplicationState';
import { initialApplicationState } from './initialApplicationState';
import type { ApplicationAction, ApplicationDispatch } from './reducer';
import { useApplicationReducer } from './reducer';

interface ApplicationContextValue {
    state: ApplicationState;
    dispatch: ApplicationDispatch;
}

const ApplicationContext = createContext<ApplicationContextValue>({
    state: initialApplicationState,
    dispatch: (() => undefined) as React.Dispatch<ApplicationAction>,
});

export const useApplicationContext = (): ApplicationContextValue => useContext(ApplicationContext);

export function ApplicationProvider({ children }: { children: ReactNode }) {
    const [state, dispatch] = useApplicationReducer();
    return (
        <ApplicationContext.Provider value={{ state, dispatch }}>
            {children}
        </ApplicationContext.Provider>
    );
}
