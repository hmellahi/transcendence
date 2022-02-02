import { Exclude } from "class-transformer";
import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export default class  User
{
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    first_name: string;

    @Column()
    last_name: string;

    @Column({nullable: true})
    login?: string;

    @Column({nullable: true})
    password: string;
    
    @Column({unique: true})
    email: string;

    // refresh token
    @Column({nullable: true})
    currentRefreshToken?: string;

    @Column({nullable: true})
    phone?: string;

    @Column({default: false})
    two_factor_auth_active: boolean;

    @Column({nullable: true})
    two_factor_auth_code: string;
}