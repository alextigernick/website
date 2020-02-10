#include "STM32L1xx.h"

#define SW1 GPIOA->IDR & 0x02
#define SW2 GPIOA->IDR & 0x04

uint8_t count = 0;
void pinSetup() {
		RCC->APB1ENR |= 0x00000010;
    RCC->AHBENR  |= 0x05;
    GPIOA->MODER &= ~0x0000003C;
    GPIOC->MODER &= ~0x000000FF;
    GPIOC->MODER |=  0x00000055;
}
void countF(){
    if (SW2)
        count++;
    else
        count--;
    if (count == 255)
        count = 9;
    else if (count == 10)
        count = 0;
}
void delay(){
		TIM6->SR = 0;	
    TIM6->PSC =  0xFFFF;
		TIM6->ARR = 30;
		TIM6->CNT = 0;
    TIM6->CR1 |= TIM_CR1_CEN;
		while (!(TIM6->SR & TIM_SR_UIF));
}
int main(void){
    pinSetup();
    while(1) {
        if (SW1) {
            delay();
            countF();
        }
        GPIOC->ODR = count & 0x0F;
    }
    
}