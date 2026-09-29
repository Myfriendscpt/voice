declare var require: any;

declare module '*.png' {
  const content: any;
  export default content;
}

declare module '*.jpg' {
  const content: any;
  export default content;
}

declare namespace Animated {
  type CompositeAnimation = any;
  type Value = any;
}

declare module 'react' {
  export function useState<T>(initialState: T | (() => T)): [T, (value: T | ((prev: T) => T)) => void];
  export function useState<T = undefined>(): [T | undefined, (value: T | ((prev: T) => T)) => void];
  export function useEffect(effect: () => void | (() => void), deps?: any[]): void;
  export function useRef<T>(initialValue: T): { current: T };
  export function useRef<T = undefined>(): { current: T | undefined };
  export function useCallback<T extends (...args: any[]) => any>(callback: T, deps: any[]): T;
  export function useMemo<T>(factory: () => T, deps: any[]): T;
  export type FC<T = any> = any;
  export type ReactNode = any;
  const React: any;
  export default React;
}

declare module 'react-native' {
  export namespace Animated {
    type CompositeAnimation = any;
    type Value = any;
  }
  export const StyleSheet: any;
  export const Text: any;
  export const View: any;
  export const Image: any;
  export const TouchableOpacity: any;
  export const TouchableHighlight: any;
  export const ScrollView: any;
  export const SafeAreaView: any;
  export const StatusBar: any;
  export const Animated: any;
  export const Platform: any;
  export const NativeModules: any;
  export const NativeEventEmitter: any;
  export const AppRegistry: any;
  export const Share: any;
  export const Alert: any;
  export const TextInput: any;
  export const Switch: any;
  export type EventSubscription = any;
  export type ImageSourcePropType = any;
  const content: any;
  export default content;
}
