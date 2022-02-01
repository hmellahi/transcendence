import { HttpException, HttpStatus, Injectable, InternalServerErrorException, UnauthorizedException } from "@nestjs/common";
import { CreateUserDto } from "src/user/dtos/createUser.dto";
import { UserService } from "src/user/user.service";
import * as bcrypt from "bcrypt";
import { PostgresErrorCode } from "src/database/postgresErrorCodes.enum";
import { UserAuthDataDto } from "./Dtos/userAuthData.dto";
import UserEntity from "src/user/entities/user.entity";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { catchError, lastValueFrom, map, Observable, take } from "rxjs";
import { AxiosResponse } from "axios";
import { HttpService } from "@nestjs/axios";

@Injectable()

export class AuthService
{
    constructor(
        private readonly userService: UserService,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
        private readonly httpService: HttpService
        ){}

    public async register(user: CreateUserDto)
    {
        const hash = bcrypt.hashSync(user.password, 10);
        try
        {
            return await this.userService.createUser({...user, phone: null, password: hash});
        }
        catch(error)
        {
            if (error?.code === PostgresErrorCode.UniqueViolation)
                throw new HttpException("Email alerady exist", HttpStatus.BAD_REQUEST);
            throw new InternalServerErrorException();
        }
    }

    public async getAuthenticatedUser(credentials: UserAuthDataDto): Promise<UserEntity>
    {
        try
        {
            const user = await this.userService.getByEmail(credentials.email);
            await this.verifyPassword(user.password, credentials.password);
            return user;

        }catch(error)
        {
            throw new HttpException("Wrong credintials", HttpStatus.BAD_REQUEST);
        }

    }

    public async connect(user: UserEntity)
    {
        console.log(user);
        console.log(user.two_factor_authenticator);
    } 

    private async verifyPassword(hashedPassword:string, plainTextPasword:string)
    {
        const isMatching = bcrypt.compareSync(plainTextPasword,
            hashedPassword);
        if (!isMatching)
            throw new HttpException("Wrong credintials", HttpStatus.BAD_REQUEST);
    }

    public getAccessJwtCookie(userId: number)
    {
        const payload: TokenPayload = {userId};
        const token = this.jwtService.sign(payload, {
            secret: this.configService.get('JWT_ACCESS_SECRET'),
            expiresIn: `${this.configService.get('JWT_ACCESS_EXPIRATION_TIME')}s`
        });
        return `Authentication=${token}; HttpOnly; Path=/;`+
                `max-Age=${this.configService.get('JWT_ACCESS_EXPIRATION_TIME')}`;
    }

    public getRefreshJwtCookie(userId: number)
    {
        const payload: TokenPayload = {userId};
        const token = this.jwtService.sign(payload,{
            secret: this.configService.get('JWT_REFRESH_SECRET'),
            expiresIn: `${this.configService.get('JWT_REFRESH_EXPIRATION_TIME')}`
        });
        const cookie = `Refresh=${token}; HttpOnly; Path=/;`+
                        `max-Age=${this.configService.get('JWT_REFRESH_EXPIRATION_TIME')}`;
        return {token, cookie}
    }

    public getCookieForLogOut() {
        return [`Authentication=; HttpOnly; Path=/; Max-Age=0`,
                `Refresh=; HttpOnly; Path=/; Max-Age=0`];
      }

    public async getUserFromIntranet(accessToken: string): Promise<CreateUserDto>
    {
        //fetch user's data from Intranet
        const observable: Observable<CreateUserDto> = this.httpService.get<CreateUserDto>("https://api.intra.42.fr/v2/me",
        {
            headers: { Authorization: `Bearer ${ accessToken }` }
        })
        .pipe(
            map((response: AxiosResponse<CreateUserDto>)=> response.data
        ),
        catchError(()=> {console.log("erro Test");throw new UnauthorizedException;}));

        const user: CreateUserDto = await lastValueFrom(observable);
        return user;
    }
}