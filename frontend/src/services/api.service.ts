// Disable prefer-default-export to keep a consistent import structure when one vs multiple services are used.
/* eslint-disable import/prefer-default-export */
import constants from '@/utils/constants';
/**
 * Default ApiService.
 * This uses the default environment variable VUE_APP_API_URL.
 * If you need another API instance, append another export as seen in the example below.
 *
 * Usage:
 *   import { ApiService, S3ApiService } from '@/services/api.service';
 */
import ApiInstance from './api.class';

// Create a new Api passing in an Axios configuration object.
export const ApiService = new ApiInstance({
  baseURL: constants().api,
});
