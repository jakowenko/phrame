// Disabling no-console error to display formatted console messages for error responses.
/* eslint-disable no-console */
import axios, {
  AxiosError,
  AxiosHeaders,
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
} from 'axios';

const errorLogStyle = 'color: #c33';

interface ApiServiceListener {
  (error: AxiosError | AxiosResponse): Promise<never> | PromiseRejectionEvent | void;
}

interface ApiServiceError {
  error: string;
  stack?: string;
  logs?: string;
  errors?: ApiService422Error[];
}

interface ApiService422Error {
  error: string;
  location: string;
  key: string;
  type?: string;
  limit?: string;
}

const defaultResponses: Record<string | number, ApiServiceListener> = {
  // Unprocessable Entity (422)
  422: (error) => {
    if (axios.isAxiosError(error) && error.response?.data) {
      const { errors } = error.response.data as ApiServiceError;
      errors
        ?.map((err) => err.error)
        .forEach((message) => {
          console.log(`%c${message}`, errorLogStyle);
        });
    } else {
      console.log('%cUnprocessable Entity: Unknown error', errorLogStyle);
    }
  },
};

export default class ApiInstance {
  instance: AxiosInstance;

  listeners: Record<string, ApiServiceListener[]>;

  token = '';

  constructor(config: AxiosRequestConfig) {
    this.instance = this.create(config);
    this.listeners = {};
  }

  /**
   * Create a new Axios instance with the provided configuration.
   *
   * @param {object} [config] Axios configuration object.
   * @returns Axios instance.
   */
  create(config: AxiosRequestConfig) {
    // Create a new instance of axios with provided configuration.
    this.instance = axios.create({
      headers: {
        'Content-Type': 'application/json',
      },
      ...config,
    });

    // Request interceptor
    // Adds the Authorization header if `token` is set.
    this.instance.interceptors.request.use((req) => {
      if (this.token && req.headers) (req.headers as AxiosHeaders).set('Authorization', this.token);
      return req;
    });

    // Response interceptor
    // Calls passed in global response functions and displays errors consistent with
    // latest backend API changes.
    this.instance.interceptors.response.use(
      (response) => {
        const { status } = response;
        if (status) {
          if (defaultResponses[status]) defaultResponses[status](response);
          if (this.listeners[status]?.length) {
            for (const listener of this.listeners[status]) {
              listener(response);
            }
          }
        }
        return response;
      },
      (error) => {
        if (axios.isAxiosError(error)) {
          const { status, statusText } = error.response || {};

          if (status) {
            if (status >= 400) {
              const { error: title = error.message, stack, logs } = error.response?.data as ApiServiceError;
              const url = error.config?.baseURL ? `${error.config.baseURL}${error.config.url}` : error.config?.url;
              console.group(
                `%c${error.config?.method?.toUpperCase()}: ${url} responded with a ${status} (${statusText})`,
                errorLogStyle,
              );
              console.log(`%c${title}`, errorLogStyle);
              if (defaultResponses[status]) defaultResponses[status](error);
              if (logs) {
                console.log(`%cDatadog Logs: ${logs}`, errorLogStyle);
              }
              if (import.meta.env.VUE_APP_ENV !== 'production' && stack) {
                console.groupCollapsed('%cAPI Stack Trace', errorLogStyle);
                console.log(stack);
                console.groupEnd();
              }
              console.groupEnd();
              if (this.listeners[status] && this.listeners[status].length) {
                for (const listener of this.listeners[status]) {
                  listener(error);
                }
              }
            }
            return Promise.reject(error);
          }
        }
        return Promise.reject(error);
      },
    );
    return this.instance;
  }

  /**
   * Add an event listener to API responses.
   * @param code   HTTP Status Code.
   * @param method Handler function to call.
   */
  on(code: number, method?: ApiServiceListener) {
    if (code && typeof method === 'function') {
      const codeString = code.toString();
      if (!this.listeners[codeString]) {
        this.listeners[codeString] = [];
      }
      this.listeners[codeString].push(method);
    }
  }

  /**
   * Remove an event listener to API responses.
   * @param code   HTTP Status Code used in `on` to be removed.
   * @param method Handler function to remove. If not provided, all events for provided code will be removed.
   */
  off(code: number, method: ApiServiceListener) {
    if (code) {
      const codeString = code.toString();
      if (this.listeners[codeString]) {
        if (!method) {
          this.listeners[codeString] = [];
        } else {
          const index = this.listeners[codeString].findIndex((listener) => listener === method);
          if (index > -1) {
            this.listeners[codeString].splice(index, 1);
          }
        }
      }
    }
  }

  /**
   * Set the Authentication header JWT token
   *
   * @param token JWT token
   */
  setAuth(token: string) {
    this.token = token;
  }

  /**
   * Standardize Axios methods to be consistent.
   *
   * @param endpoint Endpoint to be called
   * @param params Parameters to pass.
   * @param config Axios configuration, if needed
   * @returns Axios response Promise.
   */
  get(endpoint: string, params?: unknown, config?: AxiosRequestConfig) {
    return this.instance.get(endpoint, { ...config, params });
  }

  post(endpoint: string, params?: unknown, config?: AxiosRequestConfig) {
    return this.instance.post(endpoint, params, config);
  }

  put(endpoint: string, params?: unknown, config?: AxiosRequestConfig) {
    return this.instance.put(endpoint, params, config);
  }

  patch(endpoint: string, params?: unknown, config?: AxiosRequestConfig) {
    return this.instance.patch(endpoint, params, config);
  }

  delete(endpoint: string, params?: unknown, config?: AxiosRequestConfig) {
    return this.instance.delete(endpoint, { ...config, data: params });
  }

  head(endpoint: string, params?: unknown, config?: AxiosRequestConfig) {
    return this.instance.head(endpoint, { ...config, params });
  }
}
