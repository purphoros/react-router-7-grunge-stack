@app
grunge-stack-template

@aws
runtime nodejs22.x
profile purphoros-cli
region us-west-1

# concurrency 1
# memory 1152
# profile default
# region us-west-1
# timeout 30

@http
/*
  method any
  src build/server

@static
folder build/client

@tables
user
  pk *String

password
  pk *String # userId

note
  pk *String  # userId
  sk **String # noteId
