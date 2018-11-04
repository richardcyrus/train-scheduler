/* global jQuery, firebase */

/**
 * Train Scheduler
 *
 * The Coding Boot Camp at UNC Charlotte.
 * (c) 2018 Richard Cyrus <richard.cyrus@rcyrus.com>
 */

(function ($) {
    "use strict";

    const config = {
        apiKey: "AIzaSyAubOqrSPuKuz3ftTDNQCpetHJu_dE7AMk",
        authDomain: "train-scheduler-bf006.firebaseapp.com",
        databaseURL: "https://train-scheduler-bf006.firebaseio.com",
        projectId: "train-scheduler-bf006",
        storageBucket: "train-scheduler-bf006.appspot.com",
        messagingSenderId: "910463259916"
    };

    const TrainScheduler = (function () {

        const form = $('form');
        const table = $('tbody');

        /**
         * Display the current time on the 'Current Train Schedule'
         * panel.
         */
        const clock = function () {
            const date = new Date();

            const hour = date.getHours();
            const minutes = date.getMinutes();
            const seconds = date.getSeconds();

            function padZero(unit) {
                return (unit < 10) ? `0${unit}` : unit;
            }

            let timeDisplay = `${padZero(hour)}:${padZero(minutes)}:${padZero(seconds)}`;

            $('.clock-display').text(timeDisplay);

            setTimeout(clock, 1000);
        };

        /**
         * Determine the time to the next train returning both the
         * total minutes (next train) and the remaining interval
         * (minutes to next).
         *
         * @param departure
         * @param interval
         * @returns {{nextArrival: *, minutesAway: number}}
         */
        const getTrainTimes = function (departure, interval) {

            // Get the current date & time.
            let now = moment();

            // Convert the departure date, into a date 1 year ago.
            // This ensures for comparison purposes it's older than now().
            let firstDeparture = moment(departure, moment.HTML5_FMT.TIME).subtract(1, 'years');

            // Get the difference in minutes between now, and the
            // first departure time.
            let differenceMinutes = now.diff(firstDeparture, 'minutes');

            // Get the modulus of the minutes difference and the scheduling
            // interval.
            let intervalRemainder = differenceMinutes % interval;

            // The time to the next train is the interval, minus the
            // modulus of minutes difference from now and the interval.
            let minutesToNext = interval - intervalRemainder;

            // The next train will arrive in now + minutes to next.
            let nextTrain = now.add(minutesToNext, 'minutes');

            // Send the important parts to the caller.
            return {
                nextArrival: nextTrain,
                minutesAway: minutesToNext
            };
        };

        /**
         * Add a row to the 'Current Train Schedule' table.
         *
         * @param data
         */
        const showTrain = function (data) {
            const times = getTrainTimes(data.first,  data.interval);

            const row = `
                <tr>
                    <td>${data.start}</td>
                    <td>${data.end}</td>
                    <td>${data.interval}</td>
                    <td>${times.nextArrival.format('hh:mm A')}</td>
                    <td>${times.minutesAway}</td>
                    <td class="d-flex justify-content-around">
                        <span class="fas fa-pencil-alt edit"></span>
                        <span class="fas fa-trash-alt remove"></span>
                    </td>
                </tr>`;

            table.append(row);
        };

        /**
         * Register the click and other handlers for the application.
         */
        const registerHandlers = function () {
            form.on('submit', function (e) {
                e.preventDefault();

                const train = {
                    'start': null,
                    'end': null,
                    'first': null,
                    'interval': 0
                };

                $.each($('input'), function () {
                    if ($(this).is('input[name="train_name"]')) {
                        train.start = $(this).val();
                    } else if ($(this).is('input[name="train_destination"]')) {
                        train.end = $(this).val();
                    } else if ($(this).is('input[name="first_train"]')) {
                        train.first = $(this).val();
                    } else if ($(this).is('input[name="departure_interval"]')) {
                        train.interval = parseInt($(this).val());
                    }
                });

                showTrain(train);
            });
        };

        const init = function () {
            clock();
            registerHandlers();
        };

        return {
            start: init
        };
    })();

    TrainScheduler.start();

})(jQuery);
