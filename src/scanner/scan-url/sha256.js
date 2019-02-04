//
// Microsoft Research JavaScript Cryptography Library snippet
// https://www.microsoft.com/en-us/research/project/msr-javascript-cryptography-library/
//

var msrcryptoUtilities = (function () {

    var encodingChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";

    function base64ToBytes(encodedString) {
        /// <signature>
        ///     <summary>Converts a Base64/Base64Url string to an Array</summary>
        ///     <param name="encodedString" type="String">A Base64/Base64Url encoded string</param>
        ///     <returns type="Array" />
        /// </signature>

        // This could be encoded as base64url (different from base64)
        encodedString = encodedString.replace(/-/g, "+").replace(/_/g, "/");

        // In case the padding is missing, add some.
        while (encodedString.length % 4 !== 0) {
            encodedString += "=";
        }

        var output = [];
        var char1, char2, char3;
        var enc1, enc2, enc3, enc4;
        var i;

        // Remove any chars not in the base-64 space.
        encodedString = encodedString.replace(/[^A-Za-z0-9\+\/\=]/g, "");

        for (i = 0; i < encodedString.length; i += 4) {

            // Get 4 characters from the encoded string.
            enc1 = encodingChars.indexOf(encodedString.charAt(i));
            enc2 = encodingChars.indexOf(encodedString.charAt(i + 1));
            enc3 = encodingChars.indexOf(encodedString.charAt(i + 2));
            enc4 = encodingChars.indexOf(encodedString.charAt(i + 3));

            // Convert four 6-bit values to three characters.
            // [A7,A6,A5,A4,A3,A2][A1,A0,B7,B6,B5,B4][B3,B2,B1,B0,C7,C6][C5,C4,C3,C2,C1,C0].
            // [A7,A6,A5,A4,A3,A2,A1,A0][B7,B6,B5,B4,B3,B2,B1,B0][C7,C6,C5,C4,C3,C2,C1,C0].

            // 'char1' = all 6 bits of enc1 + 2 high-bits of enc2.
            char1 = (enc1 << 2) | (enc2 >> 4);
            // 'char2' = 4 low-bits of enc2 + 4 high-bits of enc3.
            char2 = ((enc2 & 15) << 4) | (enc3 >> 2);
            // 'char3' = 2 low-bits of enc3 + all 6 bits of enc4.
            char3 = ((enc3 & 3) << 6) | enc4;

            // Convert char1 to string character and append to output
            output.push(char1);

            // 'enc3' could be padding
            //   if so, 'char2' is ignored.
            if (enc3 !== 64) {
                output.push(char2);
            }

            // 'enc4' could be padding
            //   if so, 'char3' is ignored.
            if (enc4 !== 64) {
                output.push(char3);
            }

        }

        return output;
    }

    function bytesToInt32(bytes, index) {
        /// <summary>
        /// Converts four bytes to a 32-bit int
        /// </summary>
        /// <param name="bytes">The bytes to convert</param>
        /// <param name="index" optional="true">Optional starting point</param>
        /// <returns type="Number">32-bit number</returns>
        index = (index || 0);

        return (bytes[index] << 24) |
            (bytes[index + 1] << 16) |
            (bytes[index + 2] << 8) |
            bytes[index + 3];
    }

    function unpackData(base64String, arraySize, toUint32s) {
        /// <signature>
        ///     <summary>Unpacks Base64 encoded data into arrays of data.</summary>
        ///     <param name="base64String" type="String">Base64 encoded data</param>
        ///     <param name="arraySize" type="Number" optional="true">Break data into sub-arrays of a given length</param>
        ///     <param name="toUint32s" type="Boolean" optional="true">Treat data as 32-bit data instead of byte data</param>
        ///     <returns type="Array" />
        /// </signature>

        var bytes = base64ToBytes(base64String),
            data = [],
            i;

        if (isNaN(arraySize)) {
            return bytes;
        } else {
            for (i = 0; i < bytes.length; i += arraySize) {
                data.push(bytes.slice(i, i + arraySize));
            }
        }

        if (toUint32s) {
            for (i = 0; i < data.length; i++) {
                data[i] = (data[i][0] << 24) + (data[i][1] << 16) + (data[i][2] << 8) + data[i][3];
            }
        }

        return data;
    }

    function int32ToBytes(int32) {
        /// <signature>
        ///     <summary>Converts a 32-bit number to an Array of 4 bytes</summary>
        ///     <param name="int32" type="Number">32-bit number</param>
        ///     <returns type="Array" />
        /// </signature>
        return [(int32 >>> 24) & 255, (int32 >>> 16) & 255, (int32 >>> 8) & 255, int32 & 255];
    }

    function getVector(length, fillValue) {
        /// <signature>
        ///     <summary>Get an array filled with zeroes (or optional fillValue.)</summary>
        ///     <param name="length" type="Number">Requested array length.</param>
        ///     <param name="fillValue" type="Number" optional="true"></param>
        ///     <returns type="Array"></returns>
        /// </signature>

        // Use a default value of zero
        fillValue || (fillValue = 0);

        var res = new Array(length);
        for (var i = 0; i < length; i += 1) {
            res[i] = fillValue;
        }

        return res;
    }

    function bytesToHexString(bytes, separate) {
        /// <signature>
        ///     <summary>Converts an Array of bytes values (0-255) to a Hex string</summary>
        ///     <param name="bytes" type="Array"/>
        ///     <param name="separate" type="Boolean" optional="true">Inserts a separator for display purposes (default = false)</param>
        ///     <returns type="String" />
        /// </signature>

        var result = "";
        if (typeof separate === "undefined") {
            separate = false;
        }

        for (var i = 0; i < bytes.length; i++) {

            if (separate && (i % 4 === 0) && i !== 0) {
                result += "-";
            }

            var hexval = bytes[i].toString(16).toLowerCase();
            // Add a leading zero if needed.
            if (hexval.length === 1) {
                result += "0";
            }

            result += hexval;
        }

        return result;
    }

    function stringToUTF8Bytes(messageString) {

        var utf8 = [];
        for (var i = 0; i < messageString.length; i++) {
            var charCode = messageString.charCodeAt(i);
            if (charCode < 0x80) {
                utf8.push(charCode);
            } else if (charCode < 0x800) {
                utf8.push(0xc0 | (charCode >> 6),
                    0x80 | (charCode & 0x3f));
            } else if (charCode < 0xd800 || charCode >= 0xe000) {
                utf8.push(0xe0 | (charCode >> 12),
                    0x80 | ((charCode >> 6) & 0x3f),
                    0x80 | (charCode & 0x3f));
            }
            // surrogate pair
            else {
                i++;
                // UTF-16 encodes 0x10000-0x10FFFF by
                // subtracting 0x10000 and splitting the
                // 20 bits of 0x0-0xFFFFF into two halves
                charCode = 0x10000 + (((charCode & 0x3ff) << 10) |
                    (messageString.charCodeAt(i) & 0x3ff));
                utf8.push(0xf0 | (charCode >> 18),
                    0x80 | ((charCode >> 12) & 0x3f),
                    0x80 | ((charCode >> 6) & 0x3f),
                    0x80 | (charCode & 0x3f));
            }
        }

        return utf8;
    }

    return {
        base64ToBytes: base64ToBytes,
        bytesToInt32: bytesToInt32,
        unpackData: unpackData,
        int32ToBytes: int32ToBytes,
        getVector: getVector,
        stringToUTF8Bytes: stringToUTF8Bytes,
        bytesToHexString: bytesToHexString
    };

})();

var msrcryptoSha = function (name, der, h, k, blockBytes, blockFunction, truncateTo) {
    /// <summary>
    /// Returns a hash function using the passed in parameters.
    /// </summary>
    /// <param name="name" type="String">Name of the hash function.</param>
    /// <param name="der" type="Array"></param>
    /// <param name="h" type="Array"></param>
    /// <param name="k" type="Array"></param>
    /// <param name="blockBytes" type="Number">The number of bytes in a block.</param>
    /// <param name="blockFunction" type="BlockFunctionTypeDef">Function for processing blocks.</param>
    /// <param name="truncateTo" type="Number">Truncate the resulting hash to a fixed length.</param>
    /// <returns type="Object"></returns>

    var utils = msrcryptoUtilities;

    // Make a copy of h so we don't alter the initialization array.
    var hv = h.slice(),
        w = new Array(blockBytes),
        buffer = [],
        blocksProcessed = 0;

    function hashBlocks(message) {
        /// <summary>
        /// Breaks a array of data into full blocks and hashes each block in sequence.
        /// Data at the end of the message that does not fill an entire block is
        /// returned.
        /// </summary>
        /// <param name="message" type="Array">Byte data to hash</param>
        /// <returns type="Array">Unprocessed data at the end of the message that did
        /// not fill an entire block.</returns>

        var blockCount = Math.floor(message.length / blockBytes);

        // Process each  block of the message
        for (var block = 0; block < blockCount; block++) {
            blockFunction(message, block, hv, k, w);
        }

        // Keep track of the number of blocks processed.
        // We have to put the total message size into the padding.
        blocksProcessed += blockCount;

        // Return the unprocessed data.
        return message.slice(blockCount * blockBytes);
    }

    function hashToBytes() {
        /// <summary>
        /// Converts stored hash values (32-bit ints) to bytes.
        /// </summary>
        /// <returns type="Array"></returns>

        // Move the results to an uint8 array.
        var hash = [];

        for (var i = 0; i < hv.length; i++) {
            hash = hash.concat(utils.int32ToBytes(hv[i]));
        }

        // Truncate the results depending on the hash algorithm used.
        hash.length = (truncateTo / 8);

        return hash;
    }

    function addPadding(messageBytes) {
        /// <summary>
        /// Builds and appends padding to a message
        /// </summary>
        /// <param name="messageBytes" type="Array">Message to pad</param>
        /// <returns type="Array">The message array + padding</returns>

        var padLen = blockBytes - messageBytes.length % blockBytes;

        // If there is 8 (16 for sha-512) or less bytes of padding, pad an additional block.
        (padLen <= (blockBytes / 8)) && (padLen += blockBytes);

        // Create a new Array that will contain the message + padding
        var padding = utils.getVector(padLen);

        // Set the 1 bit at the end of the message data
        padding[0] = 128;

        // Set the length equal to the previous data len + the new data len
        var messageLenBits = (messageBytes.length + blocksProcessed * blockBytes) * 8;

        // Set the message length in the last 4 bytes
        padding[padLen - 4] = messageLenBits >>> 24 & 255;
        padding[padLen - 3] = messageLenBits >>> 16 & 255;
        padding[padLen - 2] = messageLenBits >>> 8 & 255;
        padding[padLen - 1] = messageLenBits & 255;

        return messageBytes.concat(padding);
    }

    function computeHash(messageBytes) {
        /// <summary>
        /// Computes the hash of an entire message.
        /// </summary>
        /// <param name="messageBytes" type="Array">Byte array to hash</param>
        /// <returns type="Array">Hash of message bytes</returns>

        buffer = hashBlocks(messageBytes);

        return finish();
    }

    function process(messageBytes) {
        /// <summary>
        /// Call process repeatedly to hash a stream of bytes. Then call 'finish' to
        /// complete the hash and get the final result.
        /// </summary>
        /// <param name="messageBytes" type="Array"></param>

        // Append the new data to the buffer (previous unprocessed data)
        buffer = buffer.concat(messageBytes);

        // If there is at least one block of data, hash it
        if (buffer.length >= blockBytes) {

            // The remaining unprocessed data goes back into the buffer
            buffer = hashBlocks(buffer);
        }

        return;
    }

    function finish() {
        /// <summary>
        /// Called after one or more calls to process. This will finalize the hashing
        /// of the 'streamed' data and return the hash.
        /// </summary>
        /// <returns type="Array">Hash of message bytes</returns>

        // All the full blocks of data have been processed. Now we pad the rest and hash.
        // Buffer should be empty now.
        if (hashBlocks(addPadding(buffer)).length !== 0) {
            throw new Error("buffer.length !== 0");
        }

        // Convert the intermediate hash values to bytes
        var result = hashToBytes();

        // Reset the buffer
        buffer = [];

        // Restore the initial hash values
        hv = h.slice();

        // Reset the block counter
        blocksProcessed = 0;

        return result;
    }

    return {
        name: name,
        computeHash: computeHash,
        process: process,
        finish: finish,
        der: der,
        hashLen: truncateTo,
        maxMessageSize: 0xFFFFFFFF // (2^32 - 1 is max array size in JavaScript)
    };

};

var msrcryptoSha256 = (function () {

    var utils = msrcryptoUtilities;

    function hashBlock(message, blockIndex, hv, k, w) {
        /// <summary>
        /// Block function for hashing algorithm to use.
        /// </summary>
        /// <param name="message" type="Array">Block data to hash</param>
        /// <param name="blockIndex" type="Number">The block of the data to hash</param>
        /// <param name="hv" type="Array">Initial hash values</param>
        /// <param name="k" type="Array">K constants</param>
        /// <param name="w" type="Array">Buffer for w values</param>
        /// <returns type="Array">Updated initial hash values</returns>

        var t, i, temp, x0, x1, blockSize = 64,
            mask = 0xFFFFFFFF;

        var ra = hv[0],
            rb = hv[1],
            rc = hv[2],
            rd = hv[3],
            re = hv[4],
            rf = hv[5],
            rg = hv[6],
            rh = hv[7];

        // 0 ≤ t ≤ 15
        for (i = 0; i < 16; i++) {
            w[i] = utils.bytesToInt32(message, blockIndex * blockSize + i * 4);
        }

        // 16 ≤ t ≤ 63
        for (t = 16; t < 64; t++) {

            x0 = w[t - 15];
            x1 = w[t - 2];

            w[t] = (((x1 >>> 17) | (x1 << 15)) ^ ((x1 >>> 19) | (x1 << 13)) ^ (x1 >>> 10)) +
                w[t - 7] +
                (((x0 >>> 7) | (x0 << 25)) ^ ((x0 >>> 18) | (x0 << 14)) ^ (x0 >>> 3)) +
                w[t - 16];

            w[t] = w[t] & mask;
        }

        for (i = 0; i < 64; i++) {

            temp = rh +
                ((re >>> 6 | re << 26) ^ (re >>> 11 | re << 21) ^ (re >>> 25 | re << 7)) +
                ((re & rf) ^ ((~re) & rg)) +
                k[i] + w[i];

            rd += temp;

            temp += ((ra >>> 2 | ra << 30) ^ (ra >>> 13 | ra << 19) ^ (ra >>> 22 | ra << 10)) +
                ((ra & (rb ^ rc)) ^ (rb & rc));

            rh = rg; // 'h' = g
            rg = rf; // 'g' = f
            rf = re; // 'f' = e
            re = rd; // 'e' = d
            rd = rc; // 'd' = c
            rc = rb; // 'c' = b
            rb = ra; // 'b' = a
            ra = temp; // 'a' = temp

        }

        // Update the hash values
        hv[0] += ra & mask;
        hv[1] += rb & mask;
        hv[2] += rc & mask;
        hv[3] += rd & mask;
        hv[4] += re & mask;
        hv[5] += rf & mask;
        hv[6] += rg & mask;
        hv[7] += rh & mask;

        return hv;
    }

    var k256, h256, der256, upd = utils.unpackData;

    h256 = upd("agnmZ7tnroU8bvNypU/1OlEOUn+bBWiMH4PZq1vgzRk", 4, 1);

    k256 = upd("QoovmHE3RJG1wPvP6bXbpTlWwltZ8RHxkj+CpKscXtXYB6qYEoNbASQxhb5VDH3Dcr5ddIDesf6b3AanwZvxdOSbacHvvkeGD8GdxiQMocwt6SxvSnSEqlywqdx2+YjamD5RUqgxxm2wAyfIv1l/x8bgC/PVp5FHBspjURQpKWcntwqFLhshOE0sbfxTOA0TZQpzVHZqCruBwskuknIshaK/6KGoGmZLwkuLcMdsUaPRkugZ1pkGJPQONYUQaqBwGaTBFh43bAgnSHdMNLC8tTkcDLNO2KpKW5zKT2gub/N0j4LueKVjb4TIeBSMxwIIkL7/+qRQbOu++aP3xnF48g", 4, 1);

    // SHA-256 DER encoding
    // 0x30, 0x31, 0x30, 0x0d, 0x06, 0x09, 0x60, 0x86, 0x48, 0x01, 0x65, 0x03, 0x04, 0x02, 0x01, 0x05, 0x00, 0x04, 0x20
    der256 = upd("MDEwDQYJYIZIAWUDBAIBBQAEIA");

    return {
        sha256: msrcryptoSha("SHA-256", der256, h256, k256, 64, hashBlock, 256)
    };

})();

var sha256 = (function () {

    var utils = msrcryptoUtilities;
    var crypto = msrcryptoSha256;

    function computeHash(messageString) {

        if (messageString == null) {
            messageString = "";
        }

        var bytes = utils.stringToUTF8Bytes(messageString);
        var hash = crypto.sha256.computeHash(bytes);

        return utils.bytesToHexString(hash);
    }

    return {
        computeHash: computeHash
    };

})();

module.exports = sha256;
