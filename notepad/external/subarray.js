var makeSubArray = (function() {

    var MAX_SIGNED_INT_VALUE = Math.pow(2, 32) - 1,
        hasOwnProperty = Object.prototype.hasOwnProperty;

    function ToUint32(value) {
        return value >>> 0;
    }

    function getMaxIndexProperty(object) {
        var maxIndex = -1,
            isValidProperty;

        for (var prop in object) {

            isValidProperty = (
            String(ToUint32(prop)) === prop && ToUint32(prop) !== MAX_SIGNED_INT_VALUE && hasOwnProperty.call(object, prop));

            if (isValidProperty && prop > maxIndex) {
                maxIndex = prop;
            }
        }
        return maxIndex;
    }

    return function(methods) {
        var length = 0;
        methods = methods || {};

        methods.length = {
            get: function() {
                var maxIndexProperty = +getMaxIndexProperty(this);
                return Math.max(length, maxIndexProperty + 1);
            },
            set: function(value) {
                var constrainedValue = ToUint32(value);
                if (constrainedValue !== +value) {
                    throw new RangeError();
                }
                for (var i = constrainedValue, len = this.length; i < len; i++) {
                    delete this[i];
                }
                length = constrainedValue;
            }
        };
        methods.toString = methods.toString || {
            value: Array.prototype.join
        };
        return Object.create(Array.prototype, methods);
    };
})();