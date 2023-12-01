# Revelry Engine Documentation Site

!> Project Status - This project is in a very alpha state and is not fully implemented yet.

#### Install vendor type dependencies

** Assumes running from site directory within platform project **

```sh
find deps/*.js | xargs deno vendor --force
```


#### To test before release

After publishing all packages and updating the importmap versions, add a `&DEVELOPMENT_MODE=false` query parameter to the url to force it to load without the importmap to local packages.
