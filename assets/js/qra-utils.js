/**
 * QRA (Maidenhead grid locator) utilities
 * Ported from application/libraries/Qra.php — output is byte-for-byte identical.
 */
(function (global) {
    'use strict';

    function deg2rad(deg) { return deg * Math.PI / 180; }
    function rad2deg(rad) { return rad * 180 / Math.PI; }

    /**
     * Convert a Maidenhead locator to [lat, lng].
     * Supports 4-, 6-, 8-, 10-char grids and comma-separated multi-grids.
     * Returns [lat, lng] or false on invalid input.
     */
    function qra2latlong(strQRA) {
        if (!strQRA || typeof strQRA !== 'string') return false;
        strQRA = strQRA.replace(/\s+/g, '');

        if (strQRA.indexOf(',') !== -1) {
            var parts = strQRA.split(',');
            if (parts.length === 4) {
                var lengths = parts.map(function (p) { return p.length; });
                if (lengths.some(function (l) { return l !== lengths[0]; })) return false;
                var coords = [0, 0];
                for (var i = 0; i < 4; i++) {
                    var c = qra2latlong(parts[i]);
                    if (!c) return false;
                    coords[0] += c[0];
                    coords[1] += c[1];
                }
                return [Math.round(coords[0] / 4), Math.round(coords[1] / 4)];
            } else if (parts.length === 2) {
                if (parts[0].length !== parts[1].length) return false;
                var c0 = qra2latlong(parts[0]);
                var c1 = qra2latlong(parts[1]);
                if (!c0 || !c1) return false;
                var lat = c0[0] !== c1[0]
                    ? Math.round(((c0[0] + c1[0]) / 2) * 10) / 10
                    : Math.round(c0[0] * 10) / 10;
                var lng = c0[1] !== c1[1]
                    ? Math.round((c0[1] + c1[1]) / 2)
                    : Math.round(c0[1]);
                return [lat, lng];
            } else {
                return false;
            }
        }

        if (strQRA.length % 2 !== 0 || strQRA.length > 10) return [0, 0];
        strQRA = strQRA.toUpperCase();
        if (strQRA.length === 4) strQRA += 'LL';
        if (strQRA.length === 6) strQRA += '55';
        if (strQRA.length === 8) strQRA += 'LL';

        if (!/^[A-R]{2}[0-9]{2}[A-X]{2}[0-9]{2}[A-X]{2}$/.test(strQRA)) return false;

        var ch = strQRA.split('');
        var A = 'A'.charCodeAt(0);
        var Z = '0'.charCodeAt(0);
        var a  = ch[0].charCodeAt(0) - A;
        var b  = ch[1].charCodeAt(0) - A;
        var c  = ch[2].charCodeAt(0) - Z;
        var d  = ch[3].charCodeAt(0) - Z;
        var e  = ch[4].charCodeAt(0) - A;
        var f  = ch[5].charCodeAt(0) - A;
        var g  = ch[6].charCodeAt(0) - Z;
        var h  = ch[7].charCodeAt(0) - Z;
        var ii = ch[8].charCodeAt(0) - A;
        var j  = ch[9].charCodeAt(0) - A;

        var nLong = (a * 20) + (c * 2) + (e / 12) + (g / 120) + (ii / 2880) - 180;
        var nLat  = (b * 10) +  d      + (f / 24)  + (h / 240)  + (j  / 5760) - 90;

        return [nLat, nLong];
    }

    /**
     * Distance between two lat/lng points.
     * unit: 'M' miles | 'K' kilometers | 'N' nautical miles
     * Returns numeric distance rounded to 1 decimal (matches PHP distance()).
     */
    function calcDistance(lat1, lon1, lat2, lon2, unit) {
        var theta = lon1 - lon2;
        var dist = Math.sin(deg2rad(lat1)) * Math.sin(deg2rad(lat2)) +
                   Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.cos(deg2rad(theta));
        dist = Math.acos(Math.min(1, Math.max(-1, dist)));
        dist = rad2deg(dist);
        dist = dist * 60 * 1.1515;
        if (unit === 'K') dist *= 1.609344;
        else if (unit === 'N') dist *= 0.8684;
        return Math.round(dist * 10) / 10;
    }

    /**
     * Bearing in degrees (0–359) from point 1 to point 2 (matches PHP get_bearing()).
     */
    function getBearing(lat1, lon1, lat2, lon2) {
        return (Math.round(rad2deg(Math.atan2(
            Math.sin(deg2rad(lon2) - deg2rad(lon1)) * Math.cos(deg2rad(lat2)),
            Math.cos(deg2rad(lat1)) * Math.sin(deg2rad(lat2)) -
            Math.sin(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.cos(deg2rad(lon2) - deg2rad(lon1))
        ))) + 360) % 360;
    }

    /**
     * Full bearing string matching PHP Qra::bearing() output exactly.
     * e.g. "135° SE 245 kilometers"
     * myGrid / theirGrid: Maidenhead locator strings
     * unit: 'M' | 'K' | 'N'
     */
    function bearingString(myGrid, theirGrid, unit) {
        var my  = qra2latlong(myGrid);
        var stn = qra2latlong(theirGrid);
        if (!my || !stn) return '';

        var bearingDeg = getBearing(my[0], my[1], stn[0], stn[1]);
        var dist = Math.round(calcDistance(my[0], my[1], stn[0], stn[1], unit || 'M')); // rounded to 0 d.p. — matches PHP

        var dirs    = ['N', 'E', 'S', 'W'];
        var rounded = Math.round(bearingDeg / 22.5) % 16;
        var dir;
        if ((rounded % 4) === 0) {
            dir = dirs[rounded / 4];
        } else {
            dir  = dirs[2 * Math.floor(((Math.floor(rounded / 4) + 1) % 4) / 2)];
            dir += dirs[1 + 2 * Math.floor(rounded / 8)];
        }

        var unitLabel = unit === 'K' ? ' kilometers' : unit === 'N' ? ' nautic miles' : ' miles';
        return Math.round(bearingDeg) + '\u00B0 ' + dir + ' ' + dist + unitLabel;
    }

    /**
     * Distance between two gridsquares in km (matches PHP searchdistance() which hardcodes 'K').
     * Returns numeric value or null on invalid input.
     */
    function distanceKm(myGrid, theirGrid) {
        var my  = qra2latlong(myGrid);
        var stn = qra2latlong(theirGrid);
        if (!my || !stn) return null;
        return calcDistance(my[0], my[1], stn[0], stn[1], 'K');
    }

    global.QraUtils = {
        qra2latlong:   qra2latlong,
        bearingString: bearingString,
        distanceKm:    distanceKm,
    };

}(window));
