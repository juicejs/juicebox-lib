import {Pipe, PipeTransform, OnDestroy} from "@angular/core";
import {JuiceboxService} from "../services/Juicebox.service";
@Pipe({
    name:'timeAgo',
    pure:false
})
export class TimeAgoPipe implements PipeTransform, OnDestroy {
    private timer: number;
    private language: string = 'en_GB';
    constructor(private juicebox: JuiceboxService) {
        this.language = this.juicebox.getLanguage();
    }
    transform(value:string) {
        this.removeTimer();
        let d = new Date(value);
        let now = new Date();
        let seconds = Math.round(Math.abs((now.getTime() - d.getTime())/1000));
        let timeToUpdate = (Number.isNaN(seconds)) ? 1000 : this.getSecondsUntilUpdate(seconds) *1000;
        // In zoneless mode, no need for NgZone or ChangeDetectorRef
        if (typeof window !== 'undefined') {
            this.timer = window.setTimeout(() => {
                // Signals will automatically trigger updates
            }, timeToUpdate);
        }
        let minutes = Math.round(Math.abs(seconds / 60));
        let hours = Math.round(Math.abs(minutes / 60));
        let days = Math.round(Math.abs(hours / 24));
        let months = Math.round(Math.abs(days/30.416));
        let years = Math.round(Math.abs(days/365));
        if (this.language == 'de_DE') {
            if (Number.isNaN(seconds)){
                return '';
            } else if (seconds <= 45) {
                return 'vor ein paar Sekunden';
            } else if (seconds <= 90) {
                return 'vor 1 Minute';
            } else if (minutes <= 45) {
                return 'vor ' + minutes + ' Minuten';
            } else if (minutes <= 90) {
                return 'vor 1 Stunde';
            } else if (hours <= 22) {
                return 'vor ' + hours + ' Stunden';
            } else if (hours <= 36) {
                return 'vor 1 Tag';
            } else if (days <= 25) {
                return 'vor ' + days + ' Tagen';
            } else if (days <= 45) {
                return 'vor 1 Monat';
            } else if (days <= 345) {
                return 'vor ' + months + ' Monaten';
            } else if (days <= 545) {
                return 'vor 1 Jahr';
            } else { // (days > 545)
                return 'vor ' + years + ' Jahren';
            }
        }
        else {
            if (Number.isNaN(seconds)){
                return '';
            } else if (seconds <= 45) {
                return  'a few seconds ago';
            } else if (seconds <= 90) {
                return 'a minute ago';
            } else if (minutes <= 45) {
                return minutes + ' minutes ago';
            } else if (minutes <= 90) {
                return 'an hour ago';
            } else if (hours <= 22) {
                return hours + ' hours ago';
            } else if (hours <= 36) {
                return 'a day ago';
            } else if (days <= 25) {
                return days + ' days ago';
            } else if (days <= 45) {
                return 'a month ago';
            } else if (days <= 345) {
                return months + ' months ago';
            } else if (days <= 545) {
                return 'a year ago';
            } else { // (days > 545)
                return years + ' years ago';
            }
        }
    }
    ngOnDestroy(): void {
        this.removeTimer();
    }
    private removeTimer() {
        if (this.timer) {
            window.clearTimeout(this.timer);
            this.timer = null;
        }
    }
    private getSecondsUntilUpdate(seconds:number) {
        let min = 60;
        let hr = min * 60;
        let day = hr * 24;
        if (seconds < min) { // less than 1 min, update every 2 secs
            return 2;
        } else if (seconds < hr) { // less than an hour, update every 30 secs
            return 30;
        } else if (seconds < day) { // less then a day, update every 5 mins
            return 300;
        } else { // update every hour
            return 3600;
        }
    }
}