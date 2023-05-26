/**
 * Returns true if the string passed into it is a valid email
 * @param {string} email
 * @returns {boolean} True if the provided email is syntactically valid, false if not
 */
export const isValidEmail = (email: string) =>
  /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(
    email,
  );

/**
 * Truncates a string and appends an ellipsis if the string is longer than the specified maxStringLength
 *
 * Note: When possible, CSS text-overflow: ellipsis; should be prioritized over this
 *
 * @param {string} string
 * @param {number} maxStringLength
 * @returns {string} A truncated version of the provided string
 */
export const truncateString = (string: string, maxStringLength: number) =>
  string.length <= maxStringLength ? string : `${string.substring(0, maxStringLength)}...`;

/**
 * Converts an array of strings into one comma separated string
 * @param {array} array
 * @param {string} [conjunction='and']
 * @param {boolean} [oxfordComma=true]
 * @returns {string} A stringified version of the provided array separated by commas
 */
export const arrayToCommaSeparatedSentence = (array: [string], conjunction = 'and', oxfordComma = true) => {
  let commaSeparatedSentence = '';
  if (array.length) {
    commaSeparatedSentence += `${array[0]}`;
  }
  for (let i = 1; i < array.length; i += 1) {
    if (conjunction && i === array.length - 1) {
      if (oxfordComma) {
        commaSeparatedSentence += `, ${conjunction} ${array[i]}`;
      } else {
        commaSeparatedSentence += ` ${conjunction} ${array[i]}`;
      }
    } else {
      commaSeparatedSentence += `, ${array[i]}`;
    }
  }
  return commaSeparatedSentence;
};
