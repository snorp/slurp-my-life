slurp-my-life
======
**slurp-my-life** is a script for backing up the contents of your ThisLife library. There used to be a desktop downloader app for this purpose, but that no longer exists. According to ThisLife, the recommended way to download your library is to export it via the e-mail share feature 500MB at a time. ಠ_ಠ

This script was made after poking around in the Firefox devtools for a while. It seems to work for me, maybe it will work for you too.

#### Access Token

In order to use this tool, you need to log into your ThisLife account and try to find your access token. This is an authentication UID needed to access your account. The best way I've found to do this is by using the 'Network' pane in the Firefox devtools and observing only the 'XHR' tab. When you view your library, there should be at least one POST request to the 'json' path on the 'cmd.thislife.com' domain. Clicking the 'Params' tab on that request will show the POST data. You should see something like:

`
{"method":"dataWarehouse.log","params":["1421c31a-ee4e-32e1-91e4-fb0ae596f2e3",{"experience":"d.web","action":"appforeground"}],"headers":{"X-SFLY-SubSource":"home"},"id":null}
`

The first string in the "params" array (1421c...) is your access token.

```
$ slurp-my-life --access-token 1421c31a-ee4e-32e1-91e4-fb0ae596f2e3 --outdir ./backups
Using access token = 1421c31a-ee4e-32e1-91e4-fb0ae596f2e3
Downloading moments to './backups'
Fetching 25264 moments...
```
## Version 
* Version 1.0

## Contact
* e-mail: James Willcox [snorp@snorp.net](mailto:snorp@snorp.net)
* Twitter: [@snorp](https://twitter.com/snorp "snorp on twitter")
