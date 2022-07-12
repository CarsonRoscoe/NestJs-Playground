# Best Practices

## Endpoints

Controllers should encompass one thing

Sibling endpoints (GET/POST/PATCH/DELETE with identical paths) can exist, and must represent the fetching or manipulation of the same concept

A lack of ID specifying that sibling endpoint generally means all, except for Post, which means the id does not exist as you're creating it

```ts
@Get()
findAll() {}

@Patch()
updateMany(@Body body) {}

@Delete()
deleteMany(@Body body) {}

@Get(':id')
findOne(@Param('id') id: string) {}

@Post()
addOne(@@Body body) {}

@Patch(':id')
updateOne(@Param('id') id: @Body body) {}

@Delete(':id')
deleteOne(@Param('id') id: string) {}
```

## Parameters

Path parameters should identify a resource
i.e. /phygital/:chainId/:contractAddress/:tokenId identifiers which specific Phygital is being referred to

Query parameters should filter or sort that resource
i.e. /phygital with params `{ chainId, contractAddress, sort }` should filter down to the list of tokens being requested and sort them

Body parameters should specify data being mutated
i.e. /phygitals with a body { chainId, contractAddress, tokenId } should denote adding/updating/deleting that data

All together, if we were updating the name of a container object who returns the complete container after updating, the parameters might look like:

```ts
@Patch('id')
updateContainer(@Param('id') id: string, @Body() body, @Query() query) {
    const { name } = body
    const { sort, filter } = query
    this.service.update(id, name)
    let container = this.service.get(id)
    if (sort) {
        data.entries.sort()
    }
    if (filter) {
        data = data.entries.filter(filter)
    }
    return data
}

```

## Separation of Controllers vs Services

Controllers are the endpoint, where user requests and responses are handled

Services are the meat of the logic, where any interaction with data sources are handled

You can generate a controller via the CLI:

```
nest g controller name
```

as well as a Service via

```
nest g service name
```

which both belong in the module, you generate via

```
nest g module name
```

## Errors

```ts
throw 'Error message';
```

will have a endpoint return a error 500 "Internal server error". The error message thrown will NOT show up.

Better error handling is done by throwing a HttpException(errorMessage, errorCode). For example, a service might throw a:

```ts
throw new HttpException(`Phygital not found`, HttpStatus.NOT_FOUND);
```

Services should be throwing these errors if appropriate, rather than Controllers. This is because the Service knows WHAT went wrong and can better determine what error message to handle. If the service returns default data, the controller will not be able to discern genuine default/empty data cases from handled cases.

## Data Transfer Objects

Data transfer objects (dto) are a way to make sure the request payload has the form needed before making a request.

They should exist within a dto subfolder of their modules' subfolder.

The file is named via "action"-name, such as create-coffee or update-coffee, suffixed with .dto to make it clear what they are.

You can generate one via the CLI:

```
nest g class moduleName/dto/action-name.dto.ts
```

Classes are similar, but in capital case. E.g. ActionNameDto would be the class behind the action-name.dto.ts file

It is best practice to make all the properties of a DTO readonly, as they should not be manipulated.

```ts
export class ActionNameDto {
  readonly name: string;
  readonly brand: string;
  readonly flavours: string[];
}
```

## Validate Input Data

Within DTO's, it's important to validate the incoming data for correctness. This is done via the ValidationPipes.

We configure this during application bootstraping via:

```ts
new ValidationPipe({
  whitelist: true, // Unwanted properties are removed from a dto
  forbidNonWhitelisted: true, // Error 400 if a unwanted property is detected
  transform: true, // Transform body's into a instance of the DTO & transforms simple type casting if needed. Defaults to just matching the form, but not type
}),
```

and can use them within a DTO via attributes such as:

```ts
export class ActionNameDto {
  @IsString()
  readonly name: string;
  @IsString()
  readonly brand: string;
  @IsString({ each: true })
  readonly flavours: string[];
}
```

If the global ValidationPipe has "transform" set to true, @Pipe attributes on Controller methods are unnecesary for simple types.

For example, if you are taking in a id param, usually that defaults to a string and requires a pipe to transform into a int. With the global ValidationPipe having transform enabled, you can just declare the type is a number in the method params and that casting will be done for you. No need to add a additional pipe.

## PartialTypes in DTO

Using PartialType from @nestjs/mapped-types, we can create Dto's that inherit from another Dto, however set all properties to be nullable.

This is useful to patch/update dto's to reduce code duplication. This will inherit validation pipe rules from the parent.

```ts
export class UpdateNameDto extends PartialType(CreateNameDto) {
  @IsNumber()
  id: number;
}
```

## Custom Dependency Injecting

The dependency injection system of Nest supports injecting anything through a modules provider.

### useValue

This feature is frequently used during testing, where a provider in it's lowest level is the following object:

```json
{
 provider: ClassName,
 useValue: new ClassName())
}
```

This can be extended to not just inject classes, but raw data. For example, if we wanted to make "ChainIds" an injectable thing concept, so our prod/dev/test environments can rely on different chains, we can inject by declaring the following provider in our modules:

```json
{
  "provider": "CHAINS",
  "useValue": [1, 10, 137]
}
```

with the Service now injecting via adding to the constructor

```ts
@Inject("CHAINS") chains: nuber[],
```

### useClass

If we want to inject a new instance of a class, we can useClass

### useFactory

To create providers dynamically, we can use the useFactory function. We use this over useClass or useValue when the thing we're instantiating has dependencies of its own, as useFactory can itself do dependency injection.

```ts
{
  provide: "CHAINS",
  useFactory: (chainFactory: ChainFactory) => chainFactory.getSupportedChains(process.env.NODE_ENV),
  inject: [ChainFactory]
},
```

## Asynchronous Providers

Sometimes we don't want everything to be injected at once. For example, we might want a service to not be callable until a database connection has been established, and don't want that controller to be callable until that service is ready.

```ts
{
  provide: "CHAINS",
  useFactory: async (chainFactory: ChainFactory) => {
    await chainFactory.getSupportedChains(process.env.NODE_ENV)
  },
  inject: [ChainFactory]
},
```

And that's it! We re-use the useFactory pattern, and just make the function async. Anything depending on "CHAINS" will not be instantiated until this completes.

That means, if ChainFactory had a db connection to determine this, nothing would be setup until that db connection was established. We also could just wait on ChainFactory/the db connection being completed.

## Dynamic Modules

Unused in the application, but see src/database/database.module.ts for an example of a dynamic module.

Essentially this is a factory for creating dynamic modules where the caller can determine the inputs. In the calling modules, you just have to say:

```ts
@Module({
  imports: [
    DatabaseModule.register({
      //args
    }),
  ],
  providers: [SomeController],
})
export class SomeModule {}
```

## Providers Scope

By default, every Provider (service) is a singleton. If we want to change that, we can pass options into the @Injectable attribute

```ts
@Injectable({ scope: Scope.TRANSIENT })
export class SomeService {}
```

#### Scopes

**Singleton (Scope.DEFAULT)**
One is created for the entire application

Always recommended for performance.

**Transient (Scope.TRANSIENT)**
One is created per consumer

**Request (Scope.REQUEST)**
One is created per request and immediately garbage collected after

_NOTE:_ Scope bubbles up. This means if a Controller depends on a Service whose scope is REQUEST, a new controller will also be created per request.

Also, REQUEST scoped providers/controllers have access to the original Request object. This is useful if you want access to header specific information, such as cookies, headers, IP, etc.

```ts
@Inject(REQUEST) private readonly request: Request
```

Request scoped providers will have an impact on performance. This may slow down response time.

#### Custom Providers

If you have a custom provider, scope is declared as another variable:

```ts
{
  provide: "CHAINS",
  useFactory: (chainFactory: ChainFactory) => chainFactory.getSupportedChains(process.env.NODE_ENV),
  inject: [ChainFactory]
  scope: Scope.REQUEST
}
```

## Validating ENV Vars

Nest can check the validity of a loaded env var

By default, everything in the .env file is optional

To add required parameters, type-safety, set defaults or more, update the ConfigModule in app.module.ts to set a Joi object in validateSchema.

```ts
ConfigModule.forRoot({
  validationSchema: Joi.object({
    DATABASE_HOST: Joi.required(),
    DATABASE_PORT: Joi.number().default(5432),
  }),
}),
```

We can take it a step further and create a object that loads our env variables. This gives us full control over using any logic to control it.

```ts
// In its own app.config.ts class
export default () => ({
  environment: process.env.NODE_ENV || 'development',
  database: {
    host: process.env.DATABASE_HOST,
    port: parseInt(process.env.DATABASE_PORT, 10) || 5432,
  },
});

// In app.module.ts
ConfigModule.forRoot({
  load: [appConfig]
}),
```

Using the 2nd approach, when we use the ConfigService to get a env var, our key becomes a path to the variable. Such as configService.get("database.port")

We can take THAT a step further and create objects that represent the config for true type safety. First we make config files that are module scoped:

```ts
import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  environment: process.env.NODE_ENV || 'development',
  database: {
    host: process.env.DATABASE_HOST,
    port: parseInt(process.env.DATABASE_PORT, 10) || 5432,
  },
}));
```

Import that into our module's imports:

```ts
ConfigModule.forFeature(databaseConfig);
```

We can then inject that into Services to get the actual object loaded with our env vars:

```ts
@Inject(databaseConfig.KEY) private readonly config: ConfigType<typeof databaseConfig>
```

## Testing

There are three levels of testing:

### Services

src/name/name.service.spec.ts

### Controllers

src/name/name.controller.spec.ts

### End-to-end

test/name.e2e-spec.ts

## Misc IYK TODO Notes

If app.module.ts set "autoLoadEntities: true", it does NOT need to import each entity. Only the submodule needs to import

If app.module.ts set "synchronize: true", your DB does NOT need to be setup. Postgres tables will be instantiated or updated based on the Entities descriptions. This is a development only feature
