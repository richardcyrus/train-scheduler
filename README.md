# Train Scheduler

## Requirements

* Create an application that will allow the user to add records for train schedules.
* When adding a train, the administrator must provide the following:
    - The name of the train.
    - The destination.
    - The time of first departure.
    - The frequency at which the train departs.
* For the departure time of the first train, that value should be entered in UTC time format.
* For the frequency between trains, that value is in minutes.
* Calculate the time of the next arrival of a train.
* The Next arrival should be displayed as relative to the current time.
* The schedule time of the trains should ve viewable by multiple users.

## Bonus

* Update the "Minutes Away" and "Next Arrival" every minute.
* Implement update and remove buttons for each train.
* Allow users to edit the elements that constitute a train schedule:
    - The Train's Name
    - The Destination
    - The Arrival time

## Extra Bonus

* Implement access controls.
    - Only allow users who log in with their Google or GitHub accounts to modify the train schedule.

# Tools and Libraries

* Use Firebase to make the site multi-user capable.
* Use Moment.js to simplify the date/time calculations.
