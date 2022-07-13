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

See below for how we can use Exception Filters to even further improve error handling

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

_NOTE:_ Scope bubbles up. This means if a Controller depends on a Service whose scope is REQUEST, a new controller will also be created per request. Not only that, but any Guards, Intereceptors, Pipes or Filters used will also need to be recreated.

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

## Building Blocks

There are four types of building blocks: Exception Filters, Pipes, Guards and Interceptors.

Each of these can be global scoped in main.ts via attaching to the app via app.useX(new Thing())
Each can be class scoped by using the @UseX attribute on a controller/service (@UsePipe, @UseGuard, etc)
Each can be method scoped by using the @UseX attribute on a controller/server
Pipes can be param scoped, added to route parameters, by adding it to the @Body attribute via @Body(ValidationPipe)

## Metadata

Extra metadata can be set via the @SetMetadata decorator or by creating a custom decorator which implements SetMetadata.

Metadata can be pulled in through building blocks during processing to get extra information, such as in our api-key Guard example below, where we use it to mark functions as @Public() who do NOT need to be validated by that guard.

Metadata can be accessed by having the Reflector class injected in. Once again, see the api-key Guard example for injecting this reflector instance.

## Exception Filters

The catch exception filters handles unhandled exceptions. By default, unhandled exceptions are displayed as a Error 500 with a default message. This is why we usually throw a HttpException. However, if something unexpected crashes, ExceptionFilters allow us control.

When used as a decorator, it should be marked by the @Catch() decorator

We can generate a filter via running the CLI:

```
nest generate filter common/filters/http-exception
```

In our filters, we can do things such as use a logging service to track errors, use an analytics API, or transform the response to include extra data

See src/common/filters/ for examples

## Pipes

Pipes are invoked right before method call, receiving the parameters and gives the ability to transform the pipe.

We can generate a guard via running the CLI:

```
nest g pipe common/pipes/parse-chain-id
```

These pipes receive a value of the currently processed argument, as well as its metadata. Whatever value is returned by this hook will be what is passed in as parameter.

See src/common/pipes/parse-chain-id.pipe.ts to see an example of transforming a int into a ChainId enum value, and throwing if any non-valid chain id is selected

## Guards

Guards can be used to validate things such as API keys, whether routes are public/private, etc.

We can generate a guard via running the CLI:

```
nest g guard common/guards/api-key
```

These guards can be dependency injected, and return true or false on whether requests may be evaluated.

See src/common/guards/api-key.guard.ts to see an example of guarding against requests that are to a private request without the apiKey

## Interceptors

Interceptors add additional behaviour to existing code, without modifying the code itself.

This allows us to:

- Bind extra logic before or after method execution
- Transform the result returned from a method
- Transform an exception thrown by a method
- Extend method behaviour
- Override a method

We can leverage these to create features such as caching/memoization

We can generate an interceptor via running the CLI:

```
nest g interceptor common/interceptors/wrap-response
```

See src/common/interceptors/wrap-response.interceptors.ts for an example of an interceptor which is globally wrapping endpoint calls into the data property of an object, and appending the timestamp & server version number to the call

Also see src/common/interceptors/timeout.interceptors.ts for an example of an interceptor which globally handles requests that take more than 3 seconds as timeout errors.

## Middleware

Middleware is not bound to any method through decorators. Rather, its bound via a route path denoted by a string.

These are setup in the module class itself via giving it a configure method like so:

```ts
export class CommonModule {
  configure(consume: MiddlewareConsumer) {
    consume.apply(CustomMiddleware).forRoutes('*');
  }
}
```

We can also exclude routes by adding the "exclude" method to the chain after apply()

For an example, see src/common/middleware/logging.middleware.ts, where we log the time it took to create a response.

This middleware could be expanded to determine which endpoints are taking too long and log those to a database or other logging tool, to help debug slow calls and what requests were made to make the calls slow.

## Param Decorators

First, for clarity, a Param decorator is NOT a re-implementation of @Param, its a conflict of naming. @Param, @Query, @Body, @Request, these are all Param decorators. A param decorator is a decorator that can go on any Controller's method parameter for any purpose.

Param decorators are created va the createParamDecorator() function, and take in a callback. This callback takes data and a ExecutionContext. From that context we can get the request body to do our work.

See src/common/decorators/protocol.decorator.ts for an example of a param decorator you can add to a endpoint which extracts what protocol was used during the request; likely "http"

To use this decorator, add the following to any endpoint:

```
@Get()
methodName(@Protocol() protocol: string) {
  // protocol is the protocol (http/https/etc) used to access this endpoint
}
```

Passing params to @Protocol will populate the "data" field withing our Protocol's callback, changing it from "unknown" to whatever type is passed in.

## Swagger UI

SwaggerUI allows us to generate a OpenAPI page for interacting with our endpoints.

We set it up during bootstrapping via:

```ts
const options = new DocumentBuilder()
  .setTitle('My Playground')
  .setDescription('To learn NestJS')
  .setVersion('1.0')
  .build();
const document = SwaggerModule.createDocument(app, options);
SwaggerModule.setup('api', app, document);
```

By default, most information is missing, such as request structure, response structure and authentication.

We can generate most of this information adding the "@nestjs/swagger/plugin" to our nest-cWithouli.json's compilerOptions' plugins'

Without this plugin, we would need to add decorators for every piece of information, between every DTO, every entity, every parameters and every return. This plugin will do most of the heavy lifting, however some things will need to be adjusted. We are still able to add decorators to overwrite the plugin's behaviour if needed.

**Tweaks after plugin**
PartialType DTO's will have no data listed. To fix this, we must change the import for PartialType to instead come from @nestjs/swagger rather than @nestjs/mapped-types

To add descriptions & example data to our DTO's, we can use the @ApiProperty decorator on our properties to add more information, such as descriptions. For example, see the create-coffee.dto.ts for an example of adding descriptions and example values.

To add descriptions of possible responses, we can use the @ApiResponse or other @ApiXResponse decorator's on our methods. For example, see the MiscController's teapot endpoint where we add a description to the potential exception. Adding a response overrides any detected ones with the same status code, and is best used for delcaring possible exceptions that might be thrown that may not have been picked up, such as failed to authorize that was thrown by a guard.

### Tags

A way to group resources together in Swagger UI. To tag a grouping, just add the @ApiTags('groupName') to each Controller.

## Testing

NestJs supports testing through jest for virtually every bit of our code.

For unit tests, the files end with .spec.ts and should be in the same directory as the file being tested.

For end-to-end tests, the files end with .e2e-spec.ts and are located in the dedicated test folder in the root directory.

In order to run tests fast, NestJs runs tests in parallel, and organizes tests to run previously failed tests first, and then order them based on time.

### Jest Commands

```
// Unique Commands
npm run test # for unit tests
npm run test:e2e # for end-to-end tests
npm run test:cov # checks which lines of codes in our files are not being tested
npm run test:watch # for unit tests that automatically re-run when code changes are detected

// Specify tests
npm run test ./src/services/coffee.service.ts # Tests ONLY the coffee service
npm run test -- coffee.service # Runs coffee service & any building blocks used by the service, such as guards or pipes
```

### Testing Tips

1. Ensure all providers are available when creating a testing module, however aim to most every single provider.

2. When using TypeORM, the provider declared should use typeORM's getRepositoryToken(Entity), with useValue assigned with a valid mock.

```ts
{
  provide: getRepositoryToken(Entity),
  useValue: {
    findOne: jest.fn((id: number) => new Entity(id))
  }
}
```

3. When determining test coverage, use your mocks! Every branch in the original file must be a branch handled in the mock, and be tested against.

4. As describe() calls can be nested, we can leverage this to organize our tests.

For best practices, we organize into a three tier hierarchy:
-describe('endpoint/method')
--describe('the case being tested)
---it('should do something')
--describe('alternate path to test')
---it('should do something')

For example, this is taken from the coffees.service when testing the findOne method

```ts
describe('findOne', () => {
  describe('when coffee with ID exists', () => {
    it('should return the coffee object', async () => {
      coffeeRepository.findOne.mockReturnValue({});
      expect(await service.findOne('1')).toEqual({});
    });
  });
  describe('when no coffee exists for a ID', () => {
    it('should throw', async () => {
      coffeeRepository.findOne.mockReturnValue(undefined);
      try {
        await service.findOne('1');
      } catch (e) {
        expect(e).toBeInstanceOf(HttpException);
        expect(e.message).toEqual(`Coffee 1 not found`);
      }
    });
  });
});
```

This also organizes the output of our test suite, which is very nice once you have a large codebase with multiple tests.

6. Leverage jest.fn()

With jest.fn() being used by our mocks, we have an array of tools we can utilize.

First and foremost, when calling these functions, we can access the property and add .mockReturnValue(value), among other similarily named functions. This lets us change the behaviour of the next call on that function. By leveraging this, we often don't even need to create an implementation. We just need our mocks to match the structure of the dependency.

Secondly, with jest.fn()'s we can spy on functions to analyze the behaviour. For example, given the aboves' test examples, we could add the line:

```ts
const findOneSpy = jest.spyOn(MockImplementation.prototype, 'findOne');
await service.findOne('1');
expect(findOneSpy).toBeCalledWith('1');
```

We now confirmed that the service did internally call findOne on our implementation.

7. Relative equality

As jest is based on jasmine, it comes out of the box with all of the jasmine testing suite.

Through this, we can check for relative equality through the jest expect() function using jasmine's containg functions.

For example, say we have a dto that gets sent to a service for creating, and a db entity is returned. Presumably, this dto is a partial implementation of the entity - that is, it's missing db fields such as id, or only has the foreign key while the full db entity has the referenced entities returned.

We can do the comparison between a true entity and the dto like so:

```ts
const entity = this.someService.create(dto);
const expectedEntity = jasmine.objectContaining({
  ...dto,
  foriegnKeyMapping: jasmine.arrayContaining(
    dto.foreignKeyMapping.map((name) => jasmine.objectContaining({ name })),
  ),
});
expect(entity).toEqual(expectedEntity);
```

Despite expectedEntity not being an entity, this will pass as jasmine allowed us to preserve the quality that we can check for

8. Make mocks reusable

To increase code-reuse, we can make mocks reusable. Thanks to the jest.fn() we use in our mocks, we can leverage these functions to mock return values easily. This allows us to focus on the structure of our mocks.

For example, all TypeORM repositories share the same methods as one-another, and with jest.fn(), can have their returns mocked. This makes it a perfect candidate to be reused between multiple tests.

See src/common/test/mock-repository.ts and coffees.service.spec.ts for a example of this

9. If you are using a Transient or Request scoped provider, the standard module.get<CustomProvider>(CustomProvider) will return undefined. Instead, we just use the module.resolve function to access it.

10. Tests are a wholly different environment from src, which has a couple quirks. The ones to know about are:

a) In production/development, you can use absolute URLs for imports. In tests, everything is expected to use relative imports.

b) In production/development, if the file name has capitals but the import is lower case, it will resolve the file properly. In tests, consistency is required.

11. it.todo

We can make reminders for tests to make via adding it.todo(descriotion) calls in our describe!

### Unit Tests

Tests each individual function behaves the way expected. We frequently mock every or nearly every dependency injected into the file, and just test that the function did what it was expected to do.

As a metric for how granular we should be, the best practice is to aim that every test should not fail because any dependency failed. Failures through dependencies are a tell sign that the code was relying on the dependency, and that dependency should have been mocked to do no logic other than return what the caller NEEDS.

### End-to-end Tests

End-to-end tests are structured very similarily to the Unit Test suites, however have more available to use.

First, after compiling the module, we run module.createNestApplication() to turn build a full Nest application. This is a light application compared to our full production environment, since it's both leveraging the TestingModule and also only contains whatever modules were imported. However, this is still heavy compared to Unit Tests.

Secondly, we use the supertest package to create real http requests that we can feed into this test app. This allows us to hit real endpoints with real data, and assert the expected returns and behaviour.

e.g.

```ts
request(app.getHttpServer())
  .get(entrypointPath)
  .set(headerKey, value)
  .expect(statusCode)
  .expect(returnedResponse);
```

Since end-to-end tests effectively run the full application, we may need to run code cleanup, such as shutting down a db connection. Do invoke the shutdown, add this afterAll in the end-to-end test's describe

```ts
afterAll(() => {
  app.close();
});
```

#### Databases

Databases are a challenge for end-to-end tests. We have two solutions:

1. Mock every TypeORM repository, which gives us full flexibility, but is time consuming, and makes testing queries impossible

2. Use an in-memory database, where we don't have to mock anything.

3. Use a testing database, which is the most "real" test we can do. This adds complexitiy and overhead, however is recommended as the best practice.

As we follow best practices here, we went with ption 3. In our docker-compose.yml, we added a test-db service that uses a separate port, and in package.json added a pretest and posttest commands for docker composing up and down our database. This allows our tests to connect to this database.

When tests connect, they should set synchronize, which allows our Entities to drive the database schema. By doing this, we do not need to worry about database versions or migrations.

See coffees.e2e-spec.ts for how we configured this connection.

### Jest Utilities

### Best Practices

### Services

src/name/name.service.spec.ts

### Controllers

src/name/name.controller.spec.ts

### Filters

src/common/filters/name.filter.spec.ts

### Guards

src/common/guards/name.guard.spec.ts

### Interceptors

src/common/interceptors/name.interceptor.spec.ts

### Pipes

src/common/pipes/name.pipe.spec.ts

### Middleware

src/common/middleware/name.middleware.spec.ts

### End-to-end

test/name.e2e-spec.ts

## Misc IYK TODO Notes

If app.module.ts set "autoLoadEntities: true", it does NOT need to import each entity. Only the submodule needs to import

Using ExceptionFilters, we can enhance our error handling to catch type Error 500's or raw strings to have better error handling

Using guards we can create a private API key for non-public entrypoints. We can create a custom property @Public to attach to public Controller methods, to bypass this key requirement. This is similar to how Ryan did the guard for Jwt tokens, but something we could expand for private calls such as eth-contract task deployments or a more expansive IYK only dashboard

Using Pipes, we can create pipes to validate non-standard input, such as validating only supported chain ids are passed to an endpoint, rather than just passing the number back

Using Middleware, we can track which endpoints take too long to respond, and what the request parameters were to make the calls slow. This can help us debug things such as learn when our Alchemy pagination is slowing down our user experience or whatever else could be slow.

Using Swagger, we can create OpenAPI docs
